import { validate, parse } from '@telegram-apps/init-data-node';
import { BOT_TOKEN } from './config.js';
import { resolveLanguage } from './i18n.js';
import { getRedis } from './redis.js';

/**
 * Validate raw initData string and return parsed data.
 * Throws on invalid data.
 */
export function validateInitData(initDataRaw) {
  validate(initDataRaw, BOT_TOKEN, { expiresIn: 86400 });
  return parse(initDataRaw);
}

/**
 * Express middleware that validates the TMA initData from the Authorization header.
 * Sets req.telegramUser with the validated user data.
 *
 * Header format: Authorization: tma <raw_init_data>
 */
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';

    if (!authHeader.startsWith('tma ')) {
      console.error('[Auth] Missing auth header. Got:', authHeader ? authHeader.slice(0, 20) + '...' : '(empty)');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const initDataRaw = authHeader.slice(4); // Remove 'tma ' prefix
    
    if (!initDataRaw || initDataRaw.length < 10) {
      console.error('[Auth] initData too short:', initDataRaw?.length || 0, 'chars');
      return res.status(401).json({ error: 'Empty or invalid initData' });
    }

    const data = validateInitData(initDataRaw);

    if (!data.user) {
      console.error('[Auth] No user in parsed initData');
      return res.status(401).json({ error: 'No user data in initData' });
    }

    console.log('[Auth] Validated user:', data.user.id, data.user.firstName);

    req.telegramUser = {
      id: data.user.id,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      username: data.user.username,
      languageCode: data.user.languageCode,
      photoUrl: data.user.photoUrl,
    };

    const langHeader = req.headers['x-user-language'] || req.query.lang || data.user.languageCode || 'en';
    const lang = resolveLanguage(langHeader);
    const isManual = req.headers['x-user-language-manual'] === 'true';

    // Save language to Redis asynchronously
    try {
      const r = getRedis();
      
      const saveLanguageAndManual = async () => {
        if (isManual) {
          await r.set(`user_lang:${data.user.id}`, lang);
          await r.set(`user_lang_manual:${data.user.id}`, '1');
          console.log(`[Auth] Saved manual language ${lang} for user ${data.user.id}`);
        } else {
          const hasManual = await r.exists(`user_lang_manual:${data.user.id}`);
          if (hasManual === 0) {
            await r.set(`user_lang:${data.user.id}`, lang);
            console.log(`[Auth] Auto-saved language ${lang} for user ${data.user.id} (no manual override found)`);
          } else {
            console.log(`[Auth] Skipped saving language for user ${data.user.id} (manual override exists in Redis)`);
          }
        }
      };

      saveLanguageAndManual().catch((err) => {
        console.error(`[Auth] Failed to save language/manual flag for user ${data.user.id}:`, err.message);
      });
    } catch (err) {
      console.error(`[Auth] Redis setup failed for user language save:`, err.message);
    }

    next();
  } catch (error) {
    console.error('[Auth] initData validation failed:', error.message);
    return res.status(401).json({ error: 'Invalid initData signature' });
  }
}

/**
 * Express middleware to rate limit authenticated users.
 * Allows 30 requests per 60 seconds per user per path.
 */
export async function rateLimitMiddleware(req, res, next) {
  try {
    const user = req.telegramUser;
    if (!user || !user.id) {
      return next();
    }
    
    const r = getRedis();
    const key = `ratelimit:${user.id}:${req.path}`;
    const limit = 30; // 30 requests
    const windowSec = 60; // per 60 seconds

    const current = await r.incr(key);
    if (current === 1) {
      await r.expire(key, windowSec);
    }

    if (current > limit) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    next();
  } catch (err) {
    console.error('[RateLimit] Error:', err.message);
    next(); // Fallback: allow request if redis rate limit fails
  }
}
