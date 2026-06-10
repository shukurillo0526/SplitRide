import { t } from '../i18n/index.js';
import SplitRideLogo from './SplitRideLogo.jsx';

export default function MatchButton({ onPress, disabled, loading, fee = 150, free = false }) {
  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
      <button
        id="find-match-button"
        onClick={onPress}
        disabled={disabled || loading}
        className={`
          w-full py-4.5 px-6 rounded-2xl text-lg font-bold
          transition-all duration-300 ease-out
          flex items-center justify-center gap-3
          ${disabled || loading
            ? 'bg-white/[0.06] border border-white/[0.06] cursor-not-allowed text-tg-hint'
            : 'cta-gradient animate-glow cursor-pointer active:scale-[0.98] text-white shadow-lg'
          }
        `}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{t('searching')}...</span>
          </>
        ) : (
          <>
            <SplitRideLogo size={26} />
            <span>{t('find_match')}</span>
            {free ? (
              <span className="ml-1.5 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider animate-pulse-slow">
                {t('free_badge') || 'Free (First)'}
              </span>
            ) : (
              <span className="ml-1 text-sm opacity-70 font-semibold">— {fee} ⭐</span>
            )}
          </>
        )}
      </button>

      {!disabled && !loading && (
        <p className="text-center text-[11px] text-tg-hint mt-3 animate-fade-in">
          {t('powered_by')}
        </p>
      )}
    </div>
  );
}
