import { useState, useRef, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, setLanguage, getLanguage } from '../i18n/index.js';

export default function LanguageSwitcher({ onLanguageChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState(getLanguage());
  const dropdownRef = useRef(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === current);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelect = (code) => {
    setCurrent(code);
    setLanguage(code);
    try {
      localStorage.setItem('sr_lang_manual', 'true');
    } catch { /* ignore */ }
    setIsOpen(false);
    if (onLanguageChange) onLanguageChange(code);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="language-switcher"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-sm font-medium text-tg-text transition-all duration-200 hover:bg-white/10 active:scale-95"
      >
        <span className="text-base">{currentLang?.flag}</span>
        <span className="text-xs uppercase tracking-wide">{current}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 glass-light rounded-xl overflow-hidden shadow-2xl z-50 animate-fade-in">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left
                transition-colors duration-150
                ${lang.code === current
                  ? 'bg-white/10 text-tg-accent-text font-semibold'
                  : 'text-tg-text hover:bg-white/05'
                }
              `}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
