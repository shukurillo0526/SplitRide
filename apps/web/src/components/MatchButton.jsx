import { t } from '../i18n/index.js';

export default function MatchButton({ onPress, disabled, loading }) {
  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
      <button
        id="find-match-button"
        onClick={onPress}
        disabled={disabled || loading}
        className={`
          w-full py-5 px-6 rounded-2xl text-lg font-bold
          transition-all duration-300 ease-out
          flex items-center justify-center gap-3
          ${disabled || loading
            ? 'cta-gradient opacity-50 cursor-not-allowed'
            : 'cta-gradient animate-glow cursor-pointer active:scale-[0.98]'
          }
          text-white shadow-lg
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
            <span className="text-2xl">🚗</span>
            <span>{t('find_match')}</span>
            <span className="ml-1 text-base opacity-80">— {t('stars_fee')}</span>
          </>
        )}
      </button>

      {!disabled && !loading && (
        <p className="text-center text-xs text-tg-hint mt-3 animate-fade-in">
          {t('powered_by')}
        </p>
      )}
    </div>
  );
}
