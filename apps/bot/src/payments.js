import { MATCH_FEE_STARS, getStadium, getZone, getMatchKey } from './config.js';
import { storeChargeId, isBlacklisted, getBlacklistTTL, pushToQueue, getQueueLength } from './redis.js';
import { processMatch, setupQueueTimeout } from './matchmaking.js';
import { t, resolveLanguage } from './i18n.js';

/**
 * Create a Stars invoice link for the Mini App to open.
 * Returns the invoice URL string.
 */
export async function createMatchInvoiceLink(bot, userId, stadiumId, zoneId, lang) {
  const stadium = getStadium(stadiumId);
  const zone = getZone(stadiumId, zoneId);

  if (!stadium || !zone) {
    throw new Error('Invalid stadium or zone');
  }

  const payload = JSON.stringify({
    stadiumId,
    zoneId,
    userId,
    timestamp: Date.now(),
  });

  const description = t(lang, 'payment_description', {
    stadium: stadium.name,
    zone: zone.name,
  });

  const invoiceLink = await bot.api.createInvoiceLink(
    t(lang, 'payment_title'),       // title
    description,                      // description
    payload,                          // payload (returned on payment)
    '',                               // provider_token (empty for Stars)
    'XTR',                            // currency
    [{ label: 'Match Fee', amount: MATCH_FEE_STARS }] // prices
  );

  return invoiceLink;
}

/**
 * Process a successful Stars payment.
 * Called from the message:successful_payment handler.
 */
export async function processPayment(bot, ctx) {
  const payment = ctx.message.successful_payment;
  const userId = ctx.from.id;
  const chargeId = payment.telegram_payment_charge_id;
  const lang = resolveLanguage(ctx.from.language_code);

  let payloadData;
  try {
    payloadData = JSON.parse(payment.invoice_payload);
  } catch {
    console.error('[Payment] Failed to parse payload:', payment.invoice_payload);
    await ctx.reply(t(lang, 'error_generic'));
    return;
  }

  const { stadiumId, zoneId } = payloadData;
  const stadium = getStadium(stadiumId);
  const zone = getZone(stadiumId, zoneId);

  if (!stadium || !zone) {
    console.error('[Payment] Invalid stadium/zone in payload:', payloadData);
    await ctx.reply(t(lang, 'error_generic'));
    return;
  }

  // Check blacklist
  const blocked = await isBlacklisted(userId);
  if (blocked) {
    const ttl = await getBlacklistTTL(userId);
    const hours = Math.ceil(ttl / 3600);
    await ctx.reply(t(lang, 'blacklisted_error', { hours: hours.toString() }));
    // Refund immediately
    try {
      await bot.api.refundStarPayment(userId, chargeId);
    } catch (err) {
      console.error('[Payment] Refund failed for blacklisted user:', err.message);
    }
    return;
  }

  const matchKey = getMatchKey(stadiumId, zoneId);

  // Store charge ID for potential refunds
  await storeChargeId(userId, matchKey, chargeId);

  // Push user into matchmaking queue
  const userData = {
    userId,
    firstName: ctx.from.first_name || 'Fan',
    username: ctx.from.username || '',
    lang,
  };

  const queueLength = await pushToQueue(stadiumId, zoneId, userData);

  console.log(`[Payment] User ${userId} joined queue ${matchKey} (${queueLength}/4)`);

  if (queueLength >= 4) {
    // Full group — trigger matchmaking
    await processMatch(bot, stadiumId, zoneId);
  } else {
    // Notify user they're in queue
    const remaining = 4 - queueLength;
    await ctx.reply(
      t(lang, 'payment_success', {
        stadium: stadium.name,
        zone: zone.name,
        remaining: remaining.toString(),
      })
    );

    // Start/reset timeout for this queue
    setupQueueTimeout(bot, stadiumId, zoneId);
  }
}

/**
 * Refund a single user's Stars payment.
 */
export async function refundUser(bot, userId, chargeId) {
  try {
    await bot.api.refundStarPayment(userId, chargeId);
    console.log(`[Refund] Successfully refunded user ${userId}, charge ${chargeId}`);
    return true;
  } catch (error) {
    console.error(`[Refund] Failed for user ${userId}:`, error.message);
    return false;
  }
}
