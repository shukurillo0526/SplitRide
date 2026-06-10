import { InlineKeyboard } from 'grammy';
import {
  DISPATCH_GROUP_ID,
  DISPATCH_GROUP_USERNAME,
  MATCH_FEE_STARS,
  QUEUE_TIMEOUT_MS,
  getStadium,
  getZone,
  getMatchKey,
} from './config.js';
import {
  popFullGroup,
  getQueueMembers,
  getAllChargeIds,
  storeTopicMembers,
  storeTopicMatchKey,
  storeMatchStatus,
  removeFromQueue,
  getQueueLength,
  pushRideHistory,
  getRedis,
} from './redis.js';
import { refundUser } from './payments.js';
import { t } from './i18n.js';
import { startRideLifecycle } from './lifecycle.js';

// Track queue deadlines statelessly in Redis

/**
 * Process a full group match:
 * 1. Pop 4 users from the queue
 * 2. Create a forum topic in the Dispatch Supergroup
 * 3. Send pinned message with instructions + panic button
 * 4. DM each user with topic link
 */
export async function processMatch(bot, stadiumId, zoneId, matchedMembers = null) {
  const stadium = getStadium(stadiumId);
  const zone = getZone(stadiumId, zoneId);
  const matchKey = getMatchKey(stadiumId, zoneId);

  if (!stadium || !zone) {
    console.error('[Match] Invalid stadium/zone:', stadiumId, zoneId);
    return;
  }

  // Cancel any pending timeout for this queue
  clearQueueTimeout(stadiumId, zoneId);

  // Pop the 4 matched users (or use the pre-popped atomic Lua results)
  const members = matchedMembers || (await popFullGroup(stadiumId, zoneId));

  if (members.length < 4) {
    console.error('[Match] Not enough members popped:', members.length);
    return;
  }

  console.log(`[Match] Creating group for ${stadium.name} → ${zone.name}:`, members.map((m) => m.userId));

  try {
    // 1. Create forum topic in the Dispatch Supergroup
    const topicName = zoneId === 'custom' ? `🚗 ${stadium.name} → Other Dest.` : `🚗 ${stadium.name} → ${zone.name}`;
    const topic = await bot.api.createForumTopic(DISPATCH_GROUP_ID, topicName);
    const topicId = topic.message_thread_id;

    // Store topic data for dispute resolution
    await storeTopicMembers(topicId, members);
    await storeTopicMatchKey(topicId, matchKey);

    // 2. Build the pinned message with panic button
    const panicKeyboard = new InlineKeyboard().text(
      '🚨 Report No-Show / Refund',
      `report_noshow:${topicId}`
    );

    // Send welcome message in the topic (using first member's lang for topic, but it's a group)
    let welcomeText = t('en', 'topic_welcome', {
      stadium: stadium.name,
      zone: zoneId === 'custom' ? 'Other Destination' : zone.name,
    });

    if (zoneId === 'custom') {
      const destList = members
        .map((m) => `• ${m.firstName}: ${m.customDestination || 'Not specified'}`)
        .join('\n');
      welcomeText += `\n\n📍 CUSTOM DESTINATIONS:\n${destList}`;
    }

    const pinnedMsg = await bot.api.sendMessage(DISPATCH_GROUP_ID, welcomeText, {
      message_thread_id: topicId,
      reply_markup: panicKeyboard,
    });

    // Pin the message
    try {
      await bot.api.pinChatMessage(DISPATCH_GROUP_ID, pinnedMsg.message_id);
    } catch (err) {
      console.warn('[Match] Could not pin message:', err.message);
    }

    // 3. Build topic link
    const topicLink = `https://t.me/${DISPATCH_GROUP_USERNAME}/${topicId}`;

    // 4. DM each user with the match notification + link
    for (const member of members) {
      const lang = member.lang || 'en';
      const userZoneName = zoneId === 'custom' && member.customDestination ? member.customDestination : zone.name;

      const matchText = t(lang, 'match_found', {
        stadium: stadium.name,
        zone: userZoneName,
      });

      const dmKeyboard = new InlineKeyboard().url('🚗 Join Ride Group', topicLink);

      try {
        await bot.api.sendMessage(member.userId, matchText, {
          reply_markup: dmKeyboard,
        });
      } catch (err) {
        console.error(`[Match] Failed to DM user ${member.userId}:`, err.message);
      }

      // Update match status for frontend polling
      await storeMatchStatus(member.userId, {
        matched: true,
        topicLink,
        stadiumName: stadium.name,
        zoneName: userZoneName,
        topicId,
        matchedAt: Date.now(),
      });

      // Push to ride history
      const crew = members
        .filter((m) => m.userId !== member.userId)
        .map((m) => ({
          userId: m.userId,
          firstName: m.firstName,
          username: m.username,
        }));

      await pushRideHistory(member.userId, {
        rideId: `match_${topicId}`,
        stadiumId,
        stadiumName: stadium.name,
        zoneId,
        zoneName: userZoneName,
        status: 'matched',
        createdAt: Date.now(),
        crew,
        topicLink,
        refund: false,
      });
    }

    // Start ride lifecycle and reminders
    await startRideLifecycle(bot, topicId, stadiumId, zoneId, members, topicLink);

    console.log(`[Match] ✅ Group created: Topic ${topicId}, Link: ${topicLink}`);
  } catch (error) {
    console.error('[Match] Failed to create group:', error.message);

    // Refund all users on failure
    const chargeIds = await getAllChargeIds(matchKey);
    if (chargeIds) {
      for (const [userId, chargeId] of Object.entries(chargeIds)) {
        await refundUser(bot, parseInt(userId), chargeId);
        try {
          await bot.api.sendMessage(parseInt(userId), t('en', 'error_generic'));
        } catch { /* ignore DM failures */ }
      }
    }
  }
}

/**
 * Set up a timeout for a queue. If it doesn't fill in QUEUE_TIMEOUT_MS,
 * refund all waiting users and clear the queue.
 * This sets a fixed 15-minute deadline in Redis from the first joiner.
 */
export async function setupQueueTimeout(bot, stadiumId, zoneId) {
  const r = getRedis();
  const deadlineKey = `queue_deadline:${stadiumId}:${zoneId}`;
  const exists = await r.exists(deadlineKey);
  if (!exists) {
    await r.set(deadlineKey, '1', { ex: Math.ceil(QUEUE_TIMEOUT_MS / 1000) });
    console.log(`[Timeout] Set queue deadline for ${stadiumId}:${zoneId} in Redis`);
  }
}

/**
 * Clear a pending queue timeout.
 */
export async function clearQueueTimeout(stadiumId, zoneId) {
  const r = getRedis();
  await r.del(`queue_deadline:${stadiumId}:${zoneId}`);
}

/**
 * Scan active queues and process refunds for any that have timed out.
 */
export async function checkExpiredQueues(bot) {
  const r = getRedis();
  const activeQueues = await r.keys('match:*');

  for (const key of activeQueues) {
    const parts = key.split(':');
    if (parts.length < 3) continue;
    const stadiumId = parts[1];
    const zoneId = parts[2];

    const len = await r.llen(key);
    if (len === 0) continue;

    const deadlineKey = `queue_deadline:${stadiumId}:${zoneId}`;
    const deadlineExists = await r.exists(deadlineKey);

    if (!deadlineExists) {
      // Queue has timed out!
      const matchKey = getMatchKey(stadiumId, zoneId);
      const members = await getQueueMembers(stadiumId, zoneId);
      if (members.length === 0) continue;

      const stadium = getStadium(stadiumId);
      const zone = getZone(stadiumId, zoneId);

      console.log(`[Timeout] Queue ${matchKey} timed out with ${members.length} members (stateless)`);
      const chargeIds = await getAllChargeIds(matchKey);

      for (const member of members) {
        const lang = member.lang || 'en';
        const chargeId = chargeIds?.[member.userId.toString()];

        if (chargeId) {
          const refunded = await refundUser(bot, member.userId, chargeId);
          if (refunded) {
            try {
              await bot.api.sendMessage(
                member.userId,
                t(lang, 'queue_timeout', { amount: MATCH_FEE_STARS.toString() })
              );
            } catch { /* ignore DM failures */ }
          }
        }

        // Update match status for frontend
        await storeMatchStatus(member.userId, {
          matched: false,
          timedOut: true,
          refunded: true,
        });

        // Push to ride history
        const userZoneName = zoneId === 'custom' && member.customDestination ? member.customDestination : (zone ? zone.name : '');
        await pushRideHistory(member.userId, {
          rideId: `timeout_${Date.now()}`,
          stadiumId,
          stadiumName: stadium ? stadium.name : '',
          zoneId,
          zoneName: userZoneName,
          status: 'refunded',
          createdAt: Date.now(),
          crew: [],
          topicLink: '',
          refund: true,
          refundAmount: MATCH_FEE_STARS,
        });

        await removeFromQueue(stadiumId, zoneId, member.userId);
      }
    }
  }
}
