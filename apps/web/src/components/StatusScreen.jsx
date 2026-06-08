import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n/index.js';
import { getMatchStatus } from '../api/client.js';

export default function StatusScreen({ stadiumId, zoneId, rawInitData, onTimeout, onMatched }) {
  const [queuePosition, setQueuePosition] = useState(1);
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const status = await getMatchStatus(stadiumId, zoneId, rawInitData);

        if (status.matched) {
          clearInterval(intervalRef.current);
          onMatched(status);
          return;
        }

        if (status.timedOut) {
          clearInterval(intervalRef.current);
          setTimedOut(true);
          return;
        }

        setQueuePosition(status.queuePosition || 1);
      } catch (err) {
        console.error('[Poll] Error:', err);
      }
    };

    // Poll immediately, then every 3 seconds
    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stadiumId, zoneId, rawInitData, onMatched]);

  // ── Timeout State ────────────────────────────────────────────────────────
  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 animate-fade-in">
        <div className="text-6xl mb-6">⏰</div>
        <h2 className="text-xl font-bold text-tg-text mb-2">{t('timeout_title')}</h2>
        <p className="text-tg-hint text-center mb-8">{t('timeout_message')}</p>
        <button
          onClick={onTimeout}
          className="w-full py-4 px-6 rounded-2xl font-semibold text-white cta-gradient transition-all duration-300 active:scale-[0.98]"
        >
          {t('try_again')}
        </button>
      </div>
    );
  }

  // ── Waiting State ────────────────────────────────────────────────────────
  const progress = (queuePosition / 4) * 100;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      {/* Floating car animation */}
      <div className="text-7xl animate-float mb-8">🚗</div>

      {/* Pulsing dots */}
      <div className="dot-pulse mb-6">
        <span></span>
        <span></span>
        <span></span>
      </div>

      <h2 className="text-xl font-bold text-tg-text mb-2 animate-fade-in">
        {t('searching')}
      </h2>
      <p className="text-sm text-tg-hint text-center mb-8 animate-fade-in">
        {t('searching_subtitle')}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-4">
        <div className="progress-bar h-2.5">
          <div
            className="progress-fill h-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="text-sm font-semibold text-tg-accent-text animate-pulse-slow">
        {t('position_in_queue', {
          current: String(queuePosition),
          needed: '4',
        })}
      </p>

      {queuePosition >= 3 && (
        <p className="text-xs text-tg-hint mt-3 animate-fade-in">
          {t('hang_tight')}
        </p>
      )}

      {/* Subtle background gradient animation */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-[0.03]"
          style={{
            background: 'conic-gradient(from 0deg, #10b981, #3b82f6, #8b5cf6, #10b981)',
            animation: 'spin-slow 20s linear infinite',
          }}
        />
      </div>
    </div>
  );
}
