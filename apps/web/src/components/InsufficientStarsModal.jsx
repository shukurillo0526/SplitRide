import { t } from '../i18n/index.js';

/**
 * Modal shown when user has insufficient Telegram Stars for payment.
 */
export default function InsufficientStarsModal({ amount, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-6 animate-slide-up">
        <div className="glass-light rounded-3xl p-6 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <span className="text-3xl">⭐</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-tg-text text-center mb-2">
            {t('insufficient_stars') || `You need ${amount} ⭐ to find a match`}
          </h3>

          {/* Instructions */}
          <div className="gradient-card rounded-xl p-4 mb-5">
            <p className="text-sm text-tg-hint text-center leading-relaxed">
              {t('how_to_get_stars') || 'Go to Settings → Telegram Stars → Top Up'}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-400">1</span>
              </div>
              <p className="text-sm text-tg-text">Open Telegram <span className="text-tg-hint">Settings</span></p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-400">2</span>
              </div>
              <p className="text-sm text-tg-text">Tap <span className="text-tg-hint">Telegram Stars</span></p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-400">3</span>
              </div>
              <p className="text-sm text-tg-text">Buy <span className="font-semibold text-amber-400">{amount} ⭐</span> or more</p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-2xl font-semibold text-tg-text glass border border-white/10 transition-all duration-200 active:scale-[0.98] hover:bg-white/[0.08]"
          >
            {t('got_it') || 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
