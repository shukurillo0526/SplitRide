import { t } from '../i18n/index.js';

export default function MatchedScreen({ matchData }) {
  const { topicLink, stadiumName, zoneName } = matchData || {};

  const handleOpenGroup = () => {
    try {
      // Try Telegram's openTelegramLink first
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(topicLink);
      } else {
        window.open(topicLink, '_blank');
      }
    } catch {
      window.open(topicLink, '_blank');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-6 relative">
      {/* Celebration emoji */}
      <div className="text-7xl animate-bounce-in mb-4">🎉</div>

      {/* Heading */}
      <h2 className="text-2xl font-extrabold text-tg-text mb-1 animate-fade-in">
        {t('match_found')}
      </h2>
      <p className="text-sm text-tg-hint mb-8 animate-fade-in">
        {t('match_subtitle')}
      </p>

      {/* Route badge */}
      {stadiumName && zoneName && (
        <div className="glass-light rounded-2xl px-5 py-3 mb-8 animate-slide-up flex items-center gap-3">
          <span className="text-xl">🚗</span>
          <span className="text-sm font-semibold text-tg-text">
            {stadiumName} → {zoneName}
          </span>
        </div>
      )}

      {/* Steps card */}
      <div className="w-full gradient-card rounded-2xl p-5 mb-8 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm">📍</span>
            </div>
            <div>
              <p className="text-sm font-medium text-tg-text">{t('share_location')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm">🚪</span>
            </div>
            <div>
              <p className="text-sm font-medium text-tg-text">{t('meet_at_gate')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm">💰</span>
            </div>
            <div>
              <p className="text-sm font-medium text-tg-text">{t('split_ride')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Open group CTA */}
      <button
        id="open-group-button"
        onClick={handleOpenGroup}
        className="w-full py-5 px-6 rounded-2xl text-lg font-bold text-white cta-gradient animate-glow transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3"
        style={{ animationDelay: '0.3s' }}
      >
        <span className="text-xl">💬</span>
        {t('open_group')}
      </button>

      {/* Celebration particles */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full opacity-20"
            style={{
              background: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'][i],
              left: `${15 + i * 15}%`,
              top: `${10 + (i % 3) * 25}%`,
              animation: `float ${2 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
