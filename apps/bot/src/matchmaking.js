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
} from './redis.js';
import { refundUser } from './payments.js';
import { t } from './i18n.js';

// Track active timeouts so we can clear them if a group fills
const activeTimeouts = new Map();

/**
 * Process a full group match:
 * 1. Pop 4 users from the queue
 * 2. Create a forum topic in the Dispatch Supergroup
 * 3. Send pinned message with instructions + panic button
 * 4. DM each user with topic link
 */
export async function processMatch(bot, stadiumId, zoneId) {
  const stadium = getStadium(stadiumId);
  const zone = getZone(stadiumId, zoneId);
  const matchKey = getMatchKey(stadiumId, zoneId);

  if (!stadium || !zone) {
    console.error('[Match] Invalid stadium/zone:', stadiumId, zoneId);
    return;
  }

  // Cancel any pending timeout for this queue
  clearQueueTimeout(stadiumId, zoneId);

  // Pop the 4 matched users
  const members = await popFullGroup(stadiumId, zoneId);

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
 */
export function setupQueueTimeout(bot, stadiumId, zoneId) {
  const timeoutKey = `${stadiumId}:${zoneId}`;

  // Clear any existing timeout
  if (activeTimeouts.has(timeoutKey)) {
    clearTimeout(activeTimeouts.get(timeoutKey));
  }

  const timeout = setTimeout(async () => {
    activeTimeouts.delete(timeoutKey);

    const matchKey = getMatchKey(stadiumId, zoneId);
    const members = await getQueueMembers(stadiumId, zoneId);

    if (members.length === 0) return;

    const stadium = getStadium(stadiumId);
    const zone = getZone(stadiumId, zoneId);

    console.log(`[Timeout] Queue ${matchKey} timed out with ${members.length} members`);

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
  }, QUEUE_TIMEOUT_MS);

  activeTimeouts.set(timeoutKey, timeout);
}

/**
 * Clear a pending queue timeout.
 */
function clearQueueTimeout(stadiumId, zoneId) {
  const timeoutKey = `${stadiumId}:${zoneId}`;
  if (activeTimeouts.has(timeoutKey)) {
    clearTimeout(activeTimeouts.get(timeoutKey));
    activeTimeouts.delete(timeoutKey);
  }
}
