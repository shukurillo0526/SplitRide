import { useEffect, useState } from 'react';
import { t } from '../i18n/index.js';
import { completeRide as completeRideApi } from '../api/client.js';

export default function ActiveRideScreen({ rideData, rawInitData, onCompleted }) {
  const { stadiumName, zoneName, crew, topicLink, createdAt } = rideData;
  const [elapsed, setElapsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Live elapsed timer
  useEffect(() => {
    const updateTimer = () => {
      const diff = Date.now() - createdAt;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setElapsed(parts.join(' '));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const handleOpenGroup = () => {
    if (!topicLink) return;
    try {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(topicLink);
      } else {
        window.open(topicLink, '_blank');
      }
    } catch {
      window.open(topicLink, '_blank');
    }
  };

  const handleCompleteRide = async () => {
    const confirmMessage = t('complete_confirm') || 'Are you sure you want to end this ride? The group chat will be permanently deleted.';

    const executeComplete = async () => {
      setLoading(true);
      setError('');
      try {
        await completeRideApi(rawInitData);
        if (onCompleted) {
          onCompleted();
        }
      } catch (err) {
        console.error('[ActiveRide] Failed to complete ride:', err);
        setError(err.message || t('error') || 'Failed to complete ride');
      } finally {
        setLoading(false);
      }
    };

    // Use Telegram WebApp native confirm if available
    if (window.Telegram?.WebApp?.showConfirm) {
      window.Telegram.WebApp.showConfirm(confirmMessage, (confirmed) => {
        if (confirmed) {
          executeComplete();
        }
      });
    } else {
      if (window.confirm(confirmMessage)) {
        await executeComplete();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-6 animate-fade-in">
      {/* Upper Section */}
      <div className="space-y-6">
        {/* Driving Car Animation */}
        <div className="flex flex-col items-center justify-center py-6 relative">
          <div className="text-6xl animate-float mb-3">🚗</div>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-100" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-200" />
          </div>
          <p className="text-[11px] text-emerald-400 font-extrabold uppercase tracking-widest mt-3">
            {t('ride_in_progress') || 'Ride In Progress'}
          </p>
        </div>

        {/* Details Card */}
        <div className="glass-light rounded-3xl p-5 border border-white/5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <span className="text-xs bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/15">
              {elapsed}
            </span>
          </div>

          <p className="text-[10px] text-tg-hint font-black uppercase tracking-wider mb-2">
            {t('match_corridor') || 'Match Corridor'}
          </p>

          <h3 className="font-extrabold text-tg-text text-[17px] leading-tight mb-1">
            {stadiumName}
          </h3>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400 mb-4">
            <span>📍</span>
            <span>{zoneName}</span>
          </div>

          <div className="border-t border-white/5 pt-4">
            <h4 className="text-xs font-bold text-tg-text mb-3">
              {t('active_ride_title') || 'Your Ride Crew'}
            </h4>
            
            <div className="space-y-2.5">
              {/* Other members */}
              {crew.map((member, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-black text-white uppercase shadow-md shadow-emerald-500/10">
                    {member.firstName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-tg-text leading-tight">{member.firstName}</p>
                    {member.username && (
                      <p className="text-[11px] text-tg-hint font-medium">@{member.username}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="gradient-card rounded-2xl p-4 border border-white/5 space-y-3">
          <p className="text-xs text-tg-hint text-center leading-relaxed">
            {t('riding_instructions') || 'Open the group chat to coordinate with your matched crew and share your live location.'}
          </p>
          <div className="border-t border-white/5 pt-3">
            <p className="text-[10px] text-tg-hint/70 text-center uppercase font-bold tracking-wider mb-1">🛡️ {t('safety_first') || 'Safety First'}</p>
            <p className="text-[11px] text-tg-hint text-center leading-relaxed">
              {t('safety_disclaimer') || 'Meet in well-lit, public zones. Share your ride details with a friend.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center animate-slide-up">
            <p className="text-xs font-semibold text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 mt-6">
        <button
          onClick={handleOpenGroup}
          className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>🚗</span>
          <span>{t('open_group') || 'Open Ride Group'}</span>
        </button>

        <button
          onClick={handleCompleteRide}
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-2xl font-bold text-red-400 glass border border-red-500/10 hover:bg-red-500/5 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 rounded-full border-2 border-red-400/20 border-t-red-400 animate-spin" />
          ) : (
            <>
              <span>✅</span>
              <span>{t('complete_ride') || 'Complete Ride'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
