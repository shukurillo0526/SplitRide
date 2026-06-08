import express from 'express';
import cors from 'cors';
import { bot, webhookCallback } from './bot.js';
import { authMiddleware } from './validators.js';
import { createMatchInvoiceLink } from './payments.js';
import { resolveLanguage } from './i18n.js';
import { getQueueLength, getMatchStatus, getUserQueue, isBlacklisted, getBlacklistTTL } from './redis.js';
import {
  PORT,
  WEBHOOK_URL,
  WEBHOOK_SECRET,
  FRONTEND_URL,
  MATCH_FEE_STARS,
  getStadium,
  getZone,
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
app.post('/webhook', webhookCallback(bot, 'express'));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'splitride-bot',
    timestamp: new Date().toISOString(),
  });
});

// ─── API: Create Invoice Link ────────────────────────────────────────────────
app.post('/api/create-invoice', authMiddleware, async (req, res) => {
  try {
    const { stadiumId, zoneId } = req.body;
    const user = req.telegramUser;

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
    const invoiceUrl = await createMatchInvoiceLink(bot, user.id, stadiumId, zoneId, lang);

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
