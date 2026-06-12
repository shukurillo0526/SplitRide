import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { BOT_TOKEN, FRONTEND_URL, DISPATCH_GROUP_ID, isPromotionActive } from './config.js';
import { processPayment } from './payments.js';
import { registerDisputeHandlers } from './disputes.js';
import { t, resolveLanguage, getUserLanguage } from './i18n.js';

import { getRedis, trackEvent } from './redis.js';

// ─── Create Bot Instance ─────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

// ─── Global Middleware for Language Auto-Sync ────────────────────────────────
bot.use(async (ctx, next) => {
  if (ctx.from && ctx.from.id && !ctx.from.is_bot) {
    try {
      const r = getRedis();
      const hasManual = await r.exists(`user_lang_manual:${ctx.from.id}`);
      if (hasManual === 0) {
        const tgLang = resolveLanguage(ctx.from.language_code);
        const currentLang = await r.get(`user_lang:${ctx.from.id}`);
        if (currentLang !== tgLang) {
          await r.set(`user_lang:${ctx.from.id}`, tgLang);
          console.log(`[Bot Middleware] Auto-synced language for user ${ctx.from.id} to ${tgLang} (matching Telegram language_code ${ctx.from.language_code})`);
        }
      }
    } catch (err) {
      console.error('[Bot Middleware] Error checking/syncing user language:', err.message);
    }
  }
  await next();
});

// ─── /start Command ──────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  trackEvent('bot_started', { userId: ctx.from.id });
  const lang = await getUserLanguage(ctx.from.id, ctx.from?.language_code);

  const keyboard = new InlineKeyboard().webApp(
    t(lang, 'open_app'),
    FRONTEND_URL
  );

  let welcomeText = t(lang, 'welcome');
  if (isPromotionActive()) {
    welcomeText = `🎁 *${t(lang, 'promo_bot_alert')}*\n\n${welcomeText}`;
  }

  await ctx.reply(welcomeText, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  });
});

// ─── /testfill Command (for testing) ──────────────────────────────────────────
import { getStadium, getZone } from './config.js';
import { pushToQueue } from './redis.js';
import { processMatch } from './matchmaking.js';

bot.command('testfill', async (ctx) => {
  const parts = ctx.message.text.trim().split(/\s+/);
  if (parts.length < 3) {
    return ctx.reply('Usage: /testfill <stadiumId> <zoneId>');
  }
  const stadiumId = parts[1];
  const zoneId = parts[2];

  const stadium = getStadium(stadiumId);
  const zone = getZone(stadiumId, zoneId);
  if (!stadium || !zone) {
    return ctx.reply('Invalid stadium or zone ID.');
  }

  await ctx.reply(`Adding 3 mock users to match:${stadiumId}:${zoneId} queue...`);

  const mockUsers = [
    { userId: 10001, firstName: 'Alice', username: 'alice_fan', lang: 'en', customDestination: '' },
    { userId: 10002, firstName: 'Bob', username: 'bob_fan', lang: 'en', customDestination: '' },
    { userId: 10003, firstName: 'Charlie', username: 'charlie_fan', lang: 'en', customDestination: '' },
  ];

  for (const mockUser of mockUsers) {
    const result = await pushToQueue(stadiumId, zoneId, mockUser);
    if (result.status === 'matched') {
      await ctx.reply('Queue filled to 4! Triggering match...');
      await processMatch(bot, stadiumId, zoneId, result.members);
      return;
    }
  }

  await ctx.reply('Mock users added. Queue is still not full (make sure you joined the queue first!).');
});

// ─── Pre-Checkout Query (must answer within 10 seconds) ──────────────────────
bot.on('pre_checkout_query', async (ctx) => {
  // Always approve — validation happens after payment
  await ctx.answerPreCheckoutQuery(true);
});

// ─── Successful Payment ─────────────────────────────────────────────────────
bot.on('message:successful_payment', async (ctx) => {
  await processPayment(bot, ctx);
});

// ─── Dispute Handlers ────────────────────────────────────────────────────────
import { completeRide } from './lifecycle.js';

// Handler for coordination: user arrived at gate
bot.callbackQuery(/^arrived_gate:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const topicId = ctx.match[1];
  const firstName = ctx.from.first_name || 'A rider';
  const usernameMention = ctx.from.username ? ` (@${ctx.from.username})` : '';

  try {
    await bot.api.sendMessage(
      DISPATCH_GROUP_ID,
      `📍 *Status Update:*\n\n👋 *${firstName}*${usernameMention} has arrived at the designated meeting gate! If you are also there, share your live location or send a message to let the crew know.`,
      { message_thread_id: parseInt(topicId), parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('[Bot] Failed to post arrived_gate announcement:', err.message);
  }
});

// Handler for coordination: user ordered ride
bot.callbackQuery(/^ordered_ride:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const topicId = ctx.match[1];
  const firstName = ctx.from.first_name || 'A rider';
  const usernameMention = ctx.from.username ? ` (@${ctx.from.username})` : '';

  try {
    await bot.api.sendMessage(
      DISPATCH_GROUP_ID,
      `🚕 *Ride Update:*\n\n*${firstName}*${usernameMention} has ordered the Uber/Lyft ride! Please prepare to split the cost (150 Stars value or cash equivalent) and meet them at the gate.`,
      { message_thread_id: parseInt(topicId), parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('[Bot] Failed to post ordered_ride announcement:', err.message);
  }
});

// Handler for manual ride completion via inline button in topic
bot.callbackQuery(/^complete_ride:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const topicId = ctx.match[1];
  console.log(`[Bot] complete_ride triggered via inline button for topic ${topicId}`);
  await completeRide(bot, topicId);
});

// ─── Rating Callbacks ────────────────────────────────────────────────────────
bot.callbackQuery(/^rate:(good|bad):(.+)$/, async (ctx) => {
  const parts = ctx.callbackQuery.data.split(':');
  const rating = parts[1]; // 'good' or 'bad'
  const topicId = parts[2];

  trackEvent('ride_rated', { userId: ctx.from.id, rating, topicId });
  
  await ctx.answerCallbackQuery('Thank you for your feedback!');
  await ctx.editMessageText(
    ctx.callbackQuery.message.text + `\n\n_You rated this ride: ${rating === 'good' ? '👍 Good' : '👎 Bad'}._`,
    { parse_mode: 'Markdown' }
  );
});

// ─── Supergroup Welcome Handler ──────────────────────────────────────────────
bot.on('message:new_chat_members', async (ctx) => {
  if (!DISPATCH_GROUP_ID || ctx.chat.id.toString() !== DISPATCH_GROUP_ID.toString()) {
    return;
  }

  const newMembers = ctx.message.new_chat_members || [];
  for (const member of newMembers) {
    if (member.is_bot) continue;

    const name = member.first_name || 'Fan';
    const mention = `[${name}](tg://user?id=${member.id})`;
    const lang = await getUserLanguage(member.id, member.language_code || ctx.from?.language_code);

    let welcomeText = t(lang, 'superchat_welcome', { mention });
    if (isPromotionActive()) {
      welcomeText = `🎁 *${t(lang, 'promo_bot_group_alert')}*\n\n${welcomeText}`;
    }
    const botLink = `https://t.me/${ctx.me.username}`;
    const keyboard = new InlineKeyboard().url(t(lang, 'open_app'), botLink);

    try {
      await ctx.reply(welcomeText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        message_thread_id: ctx.message.message_thread_id,
      });
      console.log(`[Bot] Welcomed new user ${member.id} in supergroup ${ctx.chat.id}`);
    } catch (err) {
      console.error(`[Bot] Failed to send group welcome message for user ${member.id}:`, err.message);
    }
  }
});

registerDisputeHandlers(bot);

// ─── Error Boundary ──────────────────────────────────────────────────────────
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`[Bot] Error handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});

// ─── Export ──────────────────────────────────────────────────────────────────
export { bot, webhookCallback };
