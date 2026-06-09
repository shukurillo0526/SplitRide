import { InlineKeyboard } from 'grammy';
import {
  getTopicMembers,
  getTopicMatchKey,
  getAllChargeIds,
  storeReport,
  getReportCount,
  hasReported,
  markReported,
  blacklistUser,
  pushRideHistory,
} from './redis.js';
import { refundUser } from './payments.js';
import { t, resolveLanguage } from './i18n.js';
import { MATCH_FEE_STARS, DISPATCH_GROUP_ID, getStadium, getZone } from './config.js';

/**
 * Register all dispute-related callback query handlers on the bot.
 */
export function registerDisputeHandlers(bot) {
  // ── Handler: "Report No-Show" button clicked in topic ──────────────────
  bot.callbackQuery(/^report_noshow:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();

    const topicId = ctx.match[1];
    const reporterUserId = ctx.from.id;
    const lang = resolveLanguage(ctx.from.language_code);

    // Check if user already reported for this topic
    const alreadyReported = await hasReported(topicId, reporterUserId);
    if (alreadyReported) {
      try {
        await bot.api.sendMessage(reporterUserId, t(lang, 'report_already'));
      } catch { /* ignore */ }
      return;
    }

    // Get topic members
    const members = await getTopicMembers(topicId);
    if (!members) {
      try {
        await bot.api.sendMessage(reporterUserId, t(lang, 'error_generic'));
      } catch { /* ignore */ }
      return;
    }

    // Build keyboard with other members (excluding the reporter)
    const otherMembers = members.filter((m) => m.userId !== reporterUserId);

    if (otherMembers.length === 0) {
      try {
        await bot.api.sendMessage(reporterUserId, t(lang, 'error_generic'));
      } catch { /* ignore */ }
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const member of otherMembers) {
      const displayName = member.username
        ? `@${member.username}`
        : member.firstName;
      keyboard.text(displayName, `noshow_user:${topicId}:${member.userId}`).row();
    }

    // DM the reporter asking who didn't show up
    try {
      await bot.api.sendMessage(reporterUserId, t(lang, 'report_prompt'), {
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error(`[Dispute] Failed to DM reporter ${reporterUserId}:`, err.message);
    }
  });

  // ── Handler: User selects who didn't show up ──────────────────────────
  bot.callbackQuery(/^noshow_user:(\d+):(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();

    const topicId = ctx.match[1];
    const reportedUserId = parseInt(ctx.match[2]);
    const reporterUserId = ctx.from.id;
    const lang = resolveLanguage(ctx.from.language_code);

    // Prevent self-reporting
    if (reporterUserId === reportedUserId) {
      return;
    }

    // Check if already reported
    const alreadyReported = await hasReported(topicId, reporterUserId);
    if (alreadyReported) {
      try {
        await ctx.editMessageText(t(lang, 'report_already'));
      } catch { /* ignore */ }
      return;
    }

    // Store the report
    await storeReport(topicId, reporterUserId, reportedUserId);
    await markReported(topicId, reporterUserId);

    // Acknowledge
    try {
      await ctx.editMessageText(t(lang, 'report_received'));
    } catch { /* ignore */ }

    // Check consensus: 2 out of 3 other riders reported the same person
    const reportCount = await getReportCount(topicId, reportedUserId);
    console.log(`[Dispute] Topic ${topicId}: ${reportCount} reports against user ${reportedUserId}`);

    if (reportCount >= 2) {
      // ── CONSENSUS REACHED ──────────────────────────────────────────────
      console.log(`[Dispute] Consensus reached! Refunding victims, blacklisting ${reportedUserId}`);

      const members = await getTopicMembers(topicId);
      const matchKey = await getTopicMatchKey(topicId);
      const chargeIds = matchKey ? await getAllChargeIds(matchKey) : {};

      const parts = matchKey ? matchKey.split(':') : [];
      const stadiumId = parts[1] || '';
      const zoneId = parts[2] || '';
      const stadium = stadiumId ? getStadium(stadiumId) : null;
      const zone = (stadiumId && zoneId) ? getZone(stadiumId, zoneId) : null;

      // Refund all victims (everyone except the no-show)
      const victims = members.filter((m) => m.userId !== reportedUserId);

      for (const victim of victims) {
        const victimLang = victim.lang || 'en';
        const chargeId = chargeIds?.[victim.userId.toString()];

        if (chargeId) {
          const refunded = await refundUser(bot, victim.userId, chargeId);
          if (refunded) {
            try {
              await bot.api.sendMessage(
                victim.userId,
                t(victimLang, 'refund_issued', { amount: MATCH_FEE_STARS.toString() })
              );
            } catch { /* ignore DM failures */ }

            const userZoneName = zoneId === 'custom' && victim.customDestination ? victim.customDestination : (zone ? zone.name : '');
            await pushRideHistory(victim.userId, {
              rideId: `dispute_refund_${topicId}`,
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
              notes: 'Refunded due to no-show dispute consensus.',
            });
          }
        }
      }

      // Blacklist the offender (3 days)
      await blacklistUser(reportedUserId);

      // Notify the offender
      try {
        const offender = members.find((m) => m.userId === reportedUserId);
        const offenderLang = offender?.lang || 'en';
        await bot.api.sendMessage(
          reportedUserId,
          t(offenderLang, 'user_blacklisted')
        );
      } catch { /* ignore */ }

      // Announce in the topic
      try {
        await bot.api.sendMessage(
          DISPATCH_GROUP_ID,
          '⚠️ A no-show has been confirmed by consensus. Refunds have been issued to affected riders. The offending user has been suspended for 3 days.',
          { message_thread_id: parseInt(topicId) }
        );
      } catch (err) {
        console.error('[Dispute] Failed to post in topic:', err.message);
      }
    }
  });
}
