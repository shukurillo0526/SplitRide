import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { BOT_TOKEN, FRONTEND_URL, DISPATCH_GROUP_ID } from './config.js';
import { processPayment } from './payments.js';
import { registerDisputeHandlers } from './disputes.js';
import { t, resolveLanguage } from './i18n.js';

// ─── Create Bot Instance ─────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

// ─── /start Command ──────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const lang = resolveLanguage(ctx.from?.language_code);

  const keyboard = new InlineKeyboard().webApp(
    t(lang, 'open_app'),
    FRONTEND_URL
  );

  await ctx.reply(t(lang, 'welcome'), {
    reply_markup: keyboard,
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

registerDisputeHandlers(bot);

// ─── Error Boundary ──────────────────────────────────────────────────────────
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`[Bot] Error handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});

// ─── Export ──────────────────────────────────────────────────────────────────
export { bot, webhookCallback };
