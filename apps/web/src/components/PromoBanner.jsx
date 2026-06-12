import { useState, useEffect } from 'react';
import { t } from '../i18n/index.js';

export default function PromoBanner({ promotionEndDate }) {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return sessionStorage.getItem('sr_promo_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!promotionEndDate) return;

    const updateTimer = () => {
      const target = Date.parse(promotionEndDate);
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('');
        setIsVisible(false);
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      const formatted = [
        String(hours).padStart(2, '0'),
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0'),
      ].join(':');

      setTimeLeft(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [promotionEndDate]);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem('sr_promo_dismissed', 'true');
    } catch (e) {
      console.warn('[PromoBanner] sessionStorage set failed:', e);
    }
  };

  if (!isVisible || !timeLeft) return null;

  return (
    <div className="relative mb-5 p-4.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/10 border border-emerald-500/20 shadow-md shadow-emerald-500/5 overflow-hidden animate-slide-up">
      {/* Background glowing orb */}
      <div className="absolute -right-12 -top-12 w-28 h-28 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <h3 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>🎁</span> {t('promo_banner_title')}
            </h3>
          </div>
          <p className="text-[11px] text-tg-hint font-medium leading-relaxed mb-2">
            {t('promo_banner_subtitle')}
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 border border-white/5">
            <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
              {t('promo_banner_countdown', { time: timeLeft })}
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-tg-hint hover:text-white"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
