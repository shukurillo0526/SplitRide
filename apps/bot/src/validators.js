import { validate, parse } from '@telegram-apps/init-data-node';
import { BOT_TOKEN } from './config.js';

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
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const initDataRaw = authHeader.slice(4); // Remove 'tma ' prefix
    const data = validateInitData(initDataRaw);

    if (!data.user) {
      return res.status(401).json({ error: 'No user data in initData' });
    }

    req.telegramUser = {
      id: data.user.id,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      username: data.user.username,
      languageCode: data.user.languageCode,
      photoUrl: data.user.photoUrl,
    };

    next();
  } catch (error) {
    console.error('[Auth] initData validation failed:', error.message);
    return res.status(401).json({ error: 'Invalid initData signature' });
  }
}
