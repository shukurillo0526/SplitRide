import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import ru from './locales/ru.json';
import uz from './locales/uz.json';

const locales = { en, es, fr, pt, de, ja, ko, zh, ar, ru, uz };

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbekcha", flag: '🇺🇿' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

let currentLanguage = 'en';

/**
 * Detect language from Telegram's language_code.
 */
export function detectLanguage(languageCode) {
  if (!languageCode) return 'en';
  const code = languageCode.toLowerCase().split('-')[0];
  return SUPPORTED_CODES.includes(code) ? code : 'en';
}

/**
 * Set the current language.
 */
export function setLanguage(lang) {
  if (SUPPORTED_CODES.includes(lang)) {
    currentLanguage = lang;
  }
}

/**
 * Get the current language.
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Translate a key with optional parameter interpolation.
 */
export function t(key, params = {}) {
  const locale = locales[currentLanguage] || locales.en;
  let text = locale[key] || locales.en[key] || key;

  return text.replace(/\{(\w+)\}/g, (_, paramName) => {
    return params[paramName] !== undefined ? params[paramName] : `{${paramName}}`;
  });
}
