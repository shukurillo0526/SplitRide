import express from 'express';
import cors from 'cors';
import { bot, webhookCallback } from './bot.js';
import { authMiddleware } from './validators.js';
import { createMatchInvoiceLink, refundUser } from './payments.js';
import { resolveLanguage } from './i18n.js';
import {
  getQueueLength,
  getMatchStatus,
  getUserQueue,
  getQueueMembers,
  isBlacklisted,
  getBlacklistTTL,
  getRideHistory,
  pushRideHistory,
  removeFromQueue,
  getChargeId,
  storeMatchStatus,
  getRedis,
} from './redis.js';
import { completeRide, processScheduledReminders } from './lifecycle.js';
import { checkExpiredQueues } from './matchmaking.js';
import {
  PORT,
  WEBHOOK_URL,
  WEBHOOK_SECRET,
  FRONTEND_URL,
  MATCH_FEE_STARS,
  DISPATCH_GROUP_ID,
  DISPATCH_GROUP_USERNAME,
  getStadium,
  getZone,
  getMatchKey,
} from './config.js';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Webhook Endpoint ────────────────────────────────────────────────────────
app.post('/webhook', webhookCallback(bot, 'express', { secretToken: WEBHOOK_SECRET }));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'splitride-bot',
    timestamp: new Date().toISOString(),
  });
});

// Helper to check supergroup membership
async function checkGroupMembership(botInstance, userId) {
  try {
    const member = await botInstance.api.getChatMember(DISPATCH_GROUP_ID, userId);
    return !['left', 'kicked'].includes(member.status);
  } catch (error) {
    console.error(`[Membership] getChatMember failed for user ${userId}:`, error.message);
    return false; // Treat as not member on error
  }
}

// ─── API: Check Membership Status ───────────────────────────────────────────
app.get('/api/membership', authMiddleware, async (req, res) => {
  try {
    const user = req.telegramUser;
    const isMember = await checkGroupMembership(bot, user.id);
    res.json({
      member: isMember,
      joinLink: `https://t.me/${DISPATCH_GROUP_USERNAME}`,
    });
  } catch (error) {
    console.error('[API] membership check error:', error);
    res.status(500).json({ error: 'Failed to verify membership' });
  }
});

// ─── API: Create Invoice Link ────────────────────────────────────────────────
app.post('/api/create-invoice', authMiddleware, async (req, res) => {
  try {
    const { stadiumId, zoneId, customDestination } = req.body;
    const user = req.telegramUser;

    // Gate payment behind membership check
    const isMember = await checkGroupMembership(bot, user.id);
    if (!isMember) {
      return res.status(403).json({
        error: 'not_member',
        joinLink: `https://t.me/${DISPATCH_GROUP_USERNAME}`,
        message: 'You must join the SplitRide supergroup to find a match.',
      });
    }

    if (!stadiumId || !zoneId) {
      return res.status(400).json({ error: 'stadiumId and zoneId are required' });
    }

    const stadium = getStadium(stadiumId);
    const zone = getZone(stadiumId, zoneId);

    if (!stadium || !zone) {
      return res.status(400).json({ error: 'Invalid stadium or zone' });
    }

    // Check blacklist
    const blocked = await isBlacklisted(user.id);
    if (blocked) {
      const ttl = await getBlacklistTTL(user.id);
      const hours = Math.ceil(ttl / 3600);
      return res.status(403).json({
        error: 'blacklisted',
        hours,
        message: `You are suspended for ${hours} more hours due to a no-show report.`,
      });
    }

    // Check if user is already in a queue
    const existingQueue = await getUserQueue(user.id);
    if (existingQueue) {
      return res.status(409).json({
        error: 'already_in_queue',
        message: 'You are already waiting in a queue. Please wait for your current match.',
      });
    }

    const lang = resolveLanguage(user.languageCode);
    const invoiceUrl = await createMatchInvoiceLink(bot, user.id, stadiumId, zoneId, lang, customDestination);

    res.json({
      invoiceUrl,
      fee: MATCH_FEE_STARS,
      stadium: stadium.name,
      zone: zone.name,
    });
  } catch (error) {
    console.error('[API] create-invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// ─── API: Match Status (for frontend polling) ────────────────────────────────
app.get('/api/match-status', authMiddleware, async (req, res) => {
  try {
    const user = req.telegramUser;
    const { stadiumId, zoneId } = req.query;

    // Check if there's a stored match status (matched or timed out)
    const status = await getMatchStatus(user.id);
    if (status) {
      return res.json(status);
    }

    // Check queue position
    if (stadiumId && zoneId) {
      const queueLength = await getQueueLength(stadiumId, zoneId);
      return res.json({
        matched: false,
        timedOut: false,
        queuePosition: queueLength,
        queueNeeded: 4,
      });
    }

    // Check if user is in any queue
    const userQueue = await getUserQueue(user.id);
    if (userQueue) {
      const [sId, zId] = userQueue.split(':');
      const queueLength = await getQueueLength(sId, zId);
      return res.json({
        matched: false,
        timedOut: false,
        queuePosition: queueLength,
        queueNeeded: 4,
        stadiumId: sId,
        zoneId: zId,
      });
    }

    res.json({
      matched: false,
      timedOut: false,
      queuePosition: 0,
      queueNeeded: 4,
    });
  } catch (error) {
    console.error('[API] match-status error:', error);
    res.status(500).json({ error: 'Failed to check match status' });
  }
});

// ─── API: Ride History ───────────────────────────────────────────────────────
app.get('/api/ride-history', authMiddleware, async (req, res) => {
  try {
    const user = req.telegramUser;
    const history = await getRideHistory(user.id);
    res.json({ history });
  } catch (error) {
    console.error('[API] ride-history error:', error);
    res.status(500).json({ error: 'Failed to retrieve ride history' });
  }
});

// ─── API: Cancel Ride & Refund ────────────────────────────────────────────────
app.post('/api/cancel-ride', authMiddleware, async (req, res) => {
  try {
    const user = req.telegramUser;
    
    // Check if user is currently in a queue
    const userQueue = await getUserQueue(user.id);
    if (!userQueue) {
      return res.status(400).json({ error: 'You are not currently waiting in a queue.' });
    }

    const [stadiumId, zoneId] = userQueue.split(':');
    const stadium = getStadium(stadiumId);
    const zone = getZone(stadiumId, zoneId);

    if (!stadium || !zone) {
      return res.status(400).json({ error: 'Invalid stadium or zone.' });
    }

    const matchKey = getMatchKey(stadiumId, zoneId);
    const chargeId = await getChargeId(user.id, matchKey);

    if (!chargeId) {
      return res.status(404).json({ error: 'Payment record not found. Cannot refund.' });
    }

    // Refund payment via Stars Bot API
    const refunded = await refundUser(bot, user.id, chargeId);
    if (!refunded) {
      return res.status(500).json({ error: 'Failed to process refund.' });
    }

    // Retrieve the user queue entry so we can preserve customDestination if any
    const queueMembers = await getQueueMembers(stadiumId, zoneId);
    const memberEntry = queueMembers.find(m => m.userId === user.id);
    const customDestination = memberEntry?.customDestination || '';

    // Remove user from the queue in Redis
    await removeFromQueue(stadiumId, zoneId, user.id);

    // Update match status for immediate frontend polling stop
    await storeMatchStatus(user.id, {
      matched: false,
      timedOut: true,
      refunded: true,
      cancelled: true,
    });

    // Save cancellation in history
    const userZoneName = zoneId === 'custom' && customDestination ? customDestination : zone.name;
    await pushRideHistory(user.id, {
      rideId: `cancelled_${Date.now()}`,
      stadiumId,
      stadiumName: stadium.name,
      zoneId,
      zoneName: userZoneName,
      status: 'cancelled',
      createdAt: Date.now(),
      crew: [],
      topicLink: '',
      refund: true,
      refundAmount: MATCH_FEE_STARS,
    });

    res.json({ success: true, refunded: true, amount: MATCH_FEE_STARS });
  } catch (error) {
    console.error('[API] cancel-ride error:', error);
    res.status(500).json({ error: 'Failed to cancel ride.' });
  }
});

// ─── API: Get Config ─────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    matchFeeStars: MATCH_FEE_STARS,
  });
});

// ─── API: Active Ride ────────────────────────────────────────────────────────
app.get('/api/active-ride', authMiddleware, async (req, res) => {
  try {
    const user = req.telegramUser;
    const r = getRedis();
    const activeRide = await r.get(`active_ride:${user.id}`);
    if (activeRide) {
      return res.json({
        active: true,
        queued: false,
        ride: typeof activeRide === 'string' ? JSON.parse(activeRide) : activeRide
      });
    }

    const userQueue = await getUserQueue(user.id);
    if (userQueue) {
      const [stadiumId, zoneId] = userQueue.split(':');
      const queueLength = await getQueueLength(stadiumId, zoneId);
      return res.json({
        active: false,
        queued: true,
        stadiumId,
        zoneId,
        queuePosition: queueLength,
        queueNeeded: 4
      });
    }

    res.json({ active: false, queued: false });
  } catch (error) {
    console.error('[API] active-ride error:', error);
    res.status(500).json({ error: 'Failed to check active ride' });
  }
});

// ─── API: Complete Ride ──────────────────────────────────────────────────────
app.post('/api/complete-ride', authMiddleware, async (req, res) => {
  try {
    const user = req.telegramUser;
    const r = getRedis();
    const activeRideRaw = await r.get(`active_ride:${user.id}`);
    if (!activeRideRaw) {
      return res.status(404).json({ error: 'No active ride found to complete.' });
    }
    const activeRide = typeof activeRideRaw === 'string' ? JSON.parse(activeRideRaw) : activeRideRaw;
    await completeRide(bot, activeRide.topicId, false);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] complete-ride error:', error);
    res.status(500).json({ error: 'Failed to complete ride.' });
  }
});

// ─── API: Cron Job Tick ──────────────────────────────────────────────────────
app.get('/api/cron', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Running stateless cron tick...');
    await checkExpiredQueues(bot);
    await processScheduledReminders(bot);
    res.json({ success: true });
  } catch (error) {
    console.error('[Cron] Cron execution failed:', error);
    res.status(500).json({ error: 'Cron task failed.' });
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚗 SPLITRIDE Bot Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook\n`);

  // Set webhook if URL is configured
  if (WEBHOOK_URL) {
    try {
      await bot.api.setWebhook(WEBHOOK_URL, {
        secret_token: WEBHOOK_SECRET,
        drop_pending_updates: true,
      });
      console.log(`   ✅ Webhook set: ${WEBHOOK_URL}\n`);
    } catch (error) {
      console.error('   ❌ Failed to set webhook:', error.message);
      console.log('   Run `npm run webhook:set` manually.\n');
    }
  }
});
