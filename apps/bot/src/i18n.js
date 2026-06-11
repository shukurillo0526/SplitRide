import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRedis } from './redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localeCache = {};

/**
 * Load a locale JSON file into cache.
 */
function loadLocale(lang) {
  if (localeCache[lang]) return localeCache[lang];

  const filePath = path.join(__dirname, 'locales', `${lang}.json`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    localeCache[lang] = JSON.parse(raw);
    return localeCache[lang];
  } catch {
    // Fallback to English
    if (lang !== 'en') return loadLocale('en');
    return {};
  }
}

/**
 * Supported languages.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbekcha", flag: '🇺🇿' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

/**
 * Map a Telegram language_code to a supported locale.
 */
export function resolveLanguage(languageCode) {
  if (!languageCode) return 'en';
  const code = languageCode.toLowerCase().split('-')[0];
  return SUPPORTED_CODES.includes(code) ? code : 'en';
}

/**
 * Get stored user language from Redis, falling back to Telegram default.
 */
export async function getUserLanguage(userId, defaultLang = 'en') {
  try {
    const r = getRedis();
    const saved = await r.get(`user_lang:${userId}`);
    if (saved) return saved;
  } catch (err) {
    console.error(`[i18n] Failed to fetch language for user ${userId}:`, err.message);
  }
  return resolveLanguage(defaultLang);
}

/**
 * Translate a key with optional parameter interpolation.
 * t('en', 'payment_success', { stadium: 'MetLife', zone: 'Manhattan' })
 */
export function t(lang, key, params = {}) {
  const locale = loadLocale(lang);
  let text = locale[key];

  // Fallback to English if key not found
  if (!text && lang !== 'en') {
    const enLocale = loadLocale('en');
    text = enLocale[key];
  }

  if (!text) return key;

  // Interpolate {param} placeholders
  return text.replace(/\{(\w+)\}/g, (_, paramName) => {
    return params[paramName] !== undefined ? params[paramName] : `{${paramName}}`;
  });
}
