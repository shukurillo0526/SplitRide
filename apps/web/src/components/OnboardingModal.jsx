import { t } from '../i18n/index.js';
import SplitRideLogo from './SplitRideLogo.jsx';

export default function OnboardingModal({ onComplete }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-tg-bg/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-tg-bg rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden animate-slide-up">
        {/* Background glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Icon Header */}
        <div className="flex justify-center mb-6 relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <SplitRideLogo size={40} />
          </div>
          <div className="absolute bottom-0 right-1/2 translate-x-8 translate-y-2 text-2xl animate-bounce-in drop-shadow-md">
            ⚽
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-tg-text text-center tracking-tight mb-2">
          {t('welcome_title') || 'Welcome to SPLITRIDE'}
        </h2>
        <p className="text-sm text-tg-hint text-center mb-6">
          {t('welcome_subtitle') || 'The smartest way to get home from the stadium'}
        </p>

        {/* Features list */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-3 rounded-2xl glass-light border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xl">🤝</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-tg-text mb-1">{t('feature_match_title') || 'Match with Fans'}</h4>
              <p className="text-xs text-tg-hint leading-relaxed">
                {t('feature_match_desc') || 'We find 3 other fans heading to your same destination zone.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 rounded-2xl glass-light border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xl">💬</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-tg-text mb-1">{t('feature_chat_title') || 'Coordinate Easily'}</h4>
              <p className="text-xs text-tg-hint leading-relaxed">
                {t('feature_chat_desc') || 'Get a temporary Telegram group to meet up and order a ride.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 rounded-2xl glass-light border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-tg-text mb-1">{t('feature_save_title') || 'Split & Save'}</h4>
              <p className="text-xs text-tg-hint leading-relaxed">
                {t('feature_save_desc') || 'Share one Uber/Lyft and save up to 75% on surge pricing!'}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onComplete}
          className="w-full py-4 rounded-2xl text-lg font-bold text-white cta-gradient animate-glow transition-all duration-300 active:scale-[0.98] shadow-lg shadow-emerald-500/20"
        >
          {t('onboarding_cta') || "Let's Go!"}
        </button>
      </div>
    </div>
  );
}
