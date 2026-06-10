import { t } from '../i18n/index.js';

/**
 * Modal shown when the user is not a member of the SplitRide Telegram supergroup.
 */
export default function JoinGroupModal({ joinLink, onClose, onConfirm }) {
  const handleJoin = () => {
    try {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(joinLink);
      } else {
        window.open(joinLink, '_blank');
      }
    } catch {
      window.open(joinLink, '_blank');
    }
  };

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
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <span className="text-3xl">👥</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-tg-text text-center mb-2">
            {t('join_group_title') || 'Join our Telegram Group'}
          </h3>

          {/* Subtitle */}
          <div className="gradient-card rounded-xl p-4 mb-5">
            <p className="text-sm text-tg-hint text-center leading-relaxed">
              {t('join_group_subtitle') || 'You must be a member of our Telegram community to coordinate rides and access temporary chat topics.'}
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleJoin}
              className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-[0.98]"
            >
              {t('join_group_btn') || 'Join SplitRide Group'}
            </button>
            
            <button
              onClick={onConfirm}
              className="w-full py-3.5 px-6 rounded-2xl font-semibold text-tg-text glass border border-white/10 transition-all duration-200 active:scale-[0.98] hover:bg-white/[0.08]"
            >
              {t('join_group_confirm') || "I've Joined — Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
