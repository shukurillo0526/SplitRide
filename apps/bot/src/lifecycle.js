import { getRedis, pushRideHistory, storeMatchStatus } from './redis.js';
import { getStadium, getZone, DISPATCH_GROUP_ID, MATCH_FEE_STARS } from './config.js';
import { t } from './i18n.js';
import { InlineKeyboard } from 'grammy';

/**
 * Start the ride lifecycle when 4 users are matched.
 */
export async function startRideLifecycle(bot, topicId, stadiumId, zoneId, members, topicLink) {
  const r = getRedis();
  const stadium = getStadium(stadiumId);
  const zone = getZone(stadiumId, zoneId);
  const displayZoneName = zoneId === 'custom' ? 'Other Destination' : (zone ? zone.name : '');

  // 1. Store ride details for cleanup lookup
  const rideDetails = {
    stadiumId,
    stadiumName: stadium ? stadium.name : '',
    zoneId,
    zoneName: displayZoneName,
    topicId,
    topicLink,
    members: members.map(m => ({
      userId: m.userId,
      firstName: m.firstName,
      username: m.username,
      lang: m.lang || 'en',
      customDestination: m.customDestination || ''
    }))
  };
  await r.set(`ride_details:${topicId}`, JSON.stringify(rideDetails), { ex: 86400 });

  // 2. Set active_ride for each member
  for (const member of members) {
    const crew = members
      .filter((m) => m.userId !== member.userId)
      .map((m) => ({
        userId: m.userId,
        firstName: m.firstName,
        username: m.username,
        customDestination: m.customDestination || ''
      }));

    const activeRideData = {
      active: true,
      rideId: `match_${topicId}`,
      topicId,
      stadiumId,
      stadiumName: stadium ? stadium.name : '',
      zoneId,
      zoneName: zoneId === 'custom' && member.customDestination ? member.customDestination : displayZoneName,
      createdAt: Date.now(),
      crew,
      topicLink
    };

    await r.set(`active_ride:${member.userId}`, JSON.stringify(activeRideData), { ex: 10800 }); // 3 hours
  }

  // 3. Schedule staggered reminders
  const reminderSchedule = {
    topicId,
    stadiumName: stadium ? stadium.name : '',
    zoneName: displayZoneName,
    reminders: [
      { type: 'loc', dueAt: Date.now() + 180 * 1000, sent: false },          // +3 min
      { type: 'meet', dueAt: Date.now() + 300 * 1000, sent: false },         // +5 min
      { type: 'complete', dueAt: Date.now() + 3600 * 1000, sent: false },     // +60 min
      { type: 'autoclose', dueAt: Date.now() + 7200 * 1000, sent: false }     // +120 min
    ]
  };
  await r.set(`ride_reminders:${topicId}`, JSON.stringify(reminderSchedule), { ex: 86400 });
}

/**
 * Complete and close the ride, delete group topic and clean up Redis records.
 */
export async function completeRide(bot, topicId, isDispute = false) {
  const r = getRedis();
  
  // 1. Fetch details
  const rawDetails = await r.get(`ride_details:${topicId}`);
  if (!rawDetails) {
    console.warn(`[Lifecycle] CompleteRide: Details not found for topic ${topicId}`);
    return;
  }
  const details = typeof rawDetails === 'string' ? JSON.parse(rawDetails) : rawDetails;
  const { stadiumId, stadiumName, zoneId, zoneName, members, topicLink } = details;

  // 2. Clear active rides & update history/DM users
  for (const member of members) {
    await r.del(`active_ride:${member.userId}`);
    await storeMatchStatus(member.userId, null); // Clear wait/match statuses for UI

    if (!isDispute) {
      // Send DM notification with Rating
      try {
        const displayZoneName = zoneId === 'custom' && member.customDestination ? member.customDestination : zoneName;
        
        const keyboard = new InlineKeyboard()
          .text('👍 Good', `rate:good:${topicId}`)
          .text('👎 Bad', `rate:bad:${topicId}`);

        await bot.api.sendMessage(
          member.userId,
          `🚗 Your ride from *${stadiumName}* to *${displayZoneName}* has finished!\n\nHow was your ride experience?`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
      } catch (err) {
        console.warn(`[Lifecycle] DM failed for user ${member.userId}:`, err.message);
      }

      // Add to history
      const crew = members
        .filter((m) => m.userId !== member.userId)
        .map((m) => ({
          userId: m.userId,
          firstName: m.firstName,
          username: m.username,
        }));
      const displayZoneName = zoneId === 'custom' && member.customDestination ? member.customDestination : zoneName;

      await pushRideHistory(member.userId, {
        rideId: `match_${topicId}`,
        stadiumId,
        stadiumName,
        zoneId,
        zoneName: displayZoneName,
        status: 'completed',
        createdAt: Date.now(),
        crew,
        topicLink: '',
        refund: false,
      });
    }
  }

  // 3. Delete forum topic
  try {
    await bot.api.deleteForumTopic(DISPATCH_GROUP_ID, parseInt(topicId));
    console.log(`[Lifecycle] Deleted forum topic ${topicId}`);
  } catch (err) {
    console.error(`[Lifecycle] Failed to delete forum topic ${topicId}:`, err.message);
  }

  // 4. Cleanup Redis keys
  await r.del(`ride_details:${topicId}`);
  await r.del(`ride_reminders:${topicId}`);
}

/**
 * Process all scheduled reminders. Called by the cron handler.
 */
export async function processScheduledReminders(bot) {
  const r = getRedis();
  const keys = await r.keys('ride_reminders:*');
  
  for (const key of keys) {
    const rawData = await r.get(key);
    if (!rawData) continue;
    const schedule = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    const { topicId, stadiumName, zoneName, reminders } = schedule;

    // Load full details for messaging
    const rawDetails = await r.get(`ride_details:${topicId}`);
    if (!rawDetails) {
      // Clean up orphaned reminders
      await r.del(key);
      continue;
    }
    const details = typeof rawDetails === 'string' ? JSON.parse(rawDetails) : rawDetails;
    const members = details.members || [];

    let updated = false;
    let allSent = true;

    for (const reminder of reminders) {
      if (!reminder.sent) {
        if (Date.now() >= reminder.dueAt) {
          // Trigger reminder action
          console.log(`[Lifecycle] Executing reminder ${reminder.type} for topic ${topicId}`);
          
          try {
            if (reminder.type === 'loc') {
              // DM users to share location
              for (const member of members) {
                try {
                  const lang = member.lang || 'en';
                  await bot.api.sendMessage(
                    member.userId,
                    `📍 *SPLITRIDE UPDATE:*\n\nShare your live location in the group topic to help your crew find you!`,
                    { parse_mode: 'Markdown' }
                  );
                } catch { /* ignore DM blocks */ }
              }
            } else if (reminder.type === 'meet') {
              // Post meet message in topic
              await bot.api.sendMessage(
                DISPATCH_GROUP_ID,
                `⏰ *Meeting point reminder!*\n\nPlease head to the designated meeting gate at *${stadiumName}*. Share your live location here to coordinate.`,
                { message_thread_id: parseInt(topicId), parse_mode: 'Markdown' }
              );
            } else if (reminder.type === 'complete') {
              // Post completion prompt in topic with inline button
              const keyboard = new InlineKeyboard().text('✅ Complete Ride', `complete_ride:${topicId}`);
              await bot.api.sendMessage(
                DISPATCH_GROUP_ID,
                `🚗 *Has your ride ended?*\n\nPlease tap below to complete your ride and close this chat. (It will auto-close in 1 hour if inactive).`,
                {
                  message_thread_id: parseInt(topicId),
                  reply_markup: keyboard,
                  parse_mode: 'Markdown'
                }
              );
            } else if (reminder.type === 'autoclose') {
              // Auto-close ride group
              await completeRide(bot, topicId, false);
              updated = false; // We deleted the key inside completeRide, no need to update
              allSent = true;
              break;
            }
          } catch (err) {
            console.error(`[Lifecycle] Reminder ${reminder.type} execution failed:`, err.message);
          }

          reminder.sent = true;
          updated = true;
        } else {
          allSent = false;
        }
      }
    }

    if (allSent) {
      await r.del(key);
    } else if (updated) {
      await r.set(key, JSON.stringify(schedule), { ex: 86400 });
    }
  }
}
