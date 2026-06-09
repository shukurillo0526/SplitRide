import { useEffect, useState } from 'react';
import { t } from '../i18n/index.js';
import { getRideHistory } from '../api/client.js';

export default function HistoryTab({ rawInitData }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getRideHistory(rawInitData);
        setRides(data.history || []);
      } catch (err) {
        console.error('[History] Fetch error:', err);
        setError(t('error') || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [rawInitData]);

  const handleOpenGroup = (topicLink) => {
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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-4 py-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-light rounded-2xl p-5 animate-pulse flex flex-col gap-3">
            <div className="h-4 bg-white/10 rounded w-2/3" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
            <div className="h-6 bg-white/5 rounded w-1/4 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 animate-fade-in">
        {/* Empty state icon */}
        <div className="w-20 h-20 rounded-3xl glass-light flex items-center justify-center mb-6">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b7280"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-tg-text mb-2">
          {t('history_empty') || 'No rides yet'}
        </h3>
        <p className="text-sm text-tg-hint text-center max-w-[240px]">
          {t('history_empty_subtitle') || 'Your ride history will appear here after your first match'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col gap-4 py-4 overflow-y-auto pb-24">
      {rides.map((ride, idx) => {
        const formattedDate = new Date(ride.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const isMatched = ride.status === 'matched';
        const isCancelled = ride.status === 'cancelled';
        const isRefunded = ride.status === 'refunded';

        return (
          <div
            key={ride.rideId || idx}
            onClick={() => isMatched && handleOpenGroup(ride.topicLink)}
            className={`glass-light rounded-2xl p-5 transition-all duration-300 ${
              isMatched
                ? 'active:scale-[0.98] border border-emerald-500/10 hover:border-emerald-500/25 cursor-pointer'
                : 'opacity-75'
            }`}
          >
            <div className="flex justify-between items-start gap-4 mb-2">
              <div>
                <h4 className="font-bold text-tg-text text-[15px] leading-tight">
                  {ride.stadiumName || 'Stadium'}
                </h4>
                <p className="text-xs text-tg-hint font-medium mt-0.5">
                  {formattedDate}
                </p>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isMatched
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : isCancelled
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}
              >
                {isMatched ? t('match_found') : isCancelled ? t('payment_cancelled') : 'Refunded'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4 text-[13px] text-tg-text font-semibold">
              <span className="text-base">📍</span>
              <span>{ride.zoneName || 'Destination'}</span>
            </div>

            {isMatched && ride.crew && ride.crew.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex -space-x-2 overflow-hidden">
                  {ride.crew.map((member, i) => (
                    <div
                      key={i}
                      className="inline-block h-6 w-6 rounded-full ring-2 ring-[#1e1e1e] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-black text-white uppercase"
                    >
                      {member.firstName.charAt(0)}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  {t('open_group') || 'Open Group'} &rarr;
                </span>
              </div>
            )}

            {isRefunded && (
              <p className="text-xs text-orange-400/90 font-medium mt-3 flex items-center gap-1.5">
                <span>💰</span>
                {t('refund_issued', { amount: '150' }) || 'Refund of 150 ⭐ issued.'}
              </p>
            )}

            {isCancelled && (
              <p className="text-xs text-red-400/90 font-medium mt-3 flex items-center gap-1.5">
                <span>💰</span>
                {t('cancel_success', { amount: '150' }) || 'Cancelled. 150 ⭐ refunded.'}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
