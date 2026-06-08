import 'dotenv/config';
import { Bot } from 'grammy';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'splitride-secret';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is required');
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error('❌ WEBHOOK_URL is required');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

(async () => {
  try {
    await bot.api.setWebhook(WEBHOOK_URL, {
      secret_token: WEBHOOK_SECRET,
      drop_pending_updates: true,
    });
    console.log(`✅ Webhook set successfully: ${WEBHOOK_URL}`);

    const info = await bot.api.getWebhookInfo();
    console.log('Webhook info:', JSON.stringify(info, null, 2));
  } catch (error) {
    console.error('❌ Failed to set webhook:', error.message);
    process.exit(1);
  }
})();
