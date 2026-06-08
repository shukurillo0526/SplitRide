import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { BOT_TOKEN, FRONTEND_URL } from './config.js';
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
registerDisputeHandlers(bot);

// ─── Error Boundary ──────────────────────────────────────────────────────────
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`[Bot] Error handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});

// ─── Export ──────────────────────────────────────────────────────────────────
export { bot, webhookCallback };
