import { validate, parse } from '@telegram-apps/init-data-node';
import { BOT_TOKEN } from './config.js';
import { resolveLanguage } from './i18n.js';
import { getRedis } from './redis.js';

/**
 * Validate raw initData string and return parsed data.
 * Throws on invalid data.
 */
export function validateInitData(initDataRaw) {
  validate(initDataRaw, BOT_TOKEN, { expiresIn: 0 });
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

    // Save language to Redis asynchronously
    try {
      const r = getRedis();
      r.set(`user_lang:${data.user.id}`, lang).catch((err) => {
        console.error(`[Auth] Failed to save language for user ${data.user.id}:`, err.message);
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
