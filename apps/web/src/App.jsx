import { useState, useCallback, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram.js';
import { t, detectLanguage, setLanguage } from './i18n/index.js';
import { createInvoice, getActiveRide, getUserStatus } from './api/client.js';
import SplitRideLogo from './components/SplitRideLogo.jsx';
import StadiumSelector from './components/StadiumSelector.jsx';
import ZoneSelector from './components/ZoneSelector.jsx';
import MatchButton from './components/MatchButton.jsx';
import StatusScreen from './components/StatusScreen.jsx';
import MatchedScreen from './components/MatchedScreen.jsx';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import TabBar from './components/TabBar.jsx';
import HistoryTab from './components/HistoryTab.jsx';
import InsufficientStarsModal from './components/InsufficientStarsModal.jsx';
import JoinGroupModal from './components/JoinGroupModal.jsx';
import ActiveRideScreen from './components/ActiveRideScreen.jsx';
import PromoBanner from './components/PromoBanner.jsx';
import OnboardingModal from './components/OnboardingModal.jsx';

/**
 * App states: selecting → waiting → matched
 * Tabs: ride | history
 */
export default function App() {
  const { userId, firstName, languageCode, rawInitData } = useTelegram();

  const [activeTab, setActiveTab] = useState('ride');
  const [appState, setAppState] = useState('selecting'); // selecting | waiting | matched
  const [stadiumId, setStadiumId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchData, setMatchData] = useState(null);
  const [activeRideData, setActiveRideData] = useState(null);
  const [matchFee, setMatchFee] = useState(150);
  const [freeRideAvailable, setFreeRideAvailable] = useState(false);
  const [showStarsModal, setShowStarsModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLink, setJoinLink] = useState('https://t.me/SplitRide26');
  const [promoActive, setPromoActive] = useState(false);
  const [promotionEndDate, setPromotionEndDate] = useState('');
  const [stadiums, setStadiums] = useState([]);
  const [stadiumGroups, setStadiumGroups] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isMember, setIsMember] = useState(true); // default true to avoid flicker
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [, setLangTick] = useState(0); // force re-render on language change

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Onboarding check
  useEffect(() => {
    try {
      const onboarded = localStorage.getItem('sr_onboarded');
      if (!onboarded) {
        setShowOnboarding(true);
      }
    } catch (e) { /* ignore */ }
  }, []);

  // Initialize language from Telegram user, respecting manual override
  useEffect(() => {
    try {
      const isManual = localStorage.getItem('sr_lang_manual') === 'true';
      if (!isManual) {
        const lang = detectLanguage(languageCode);
        setLanguage(lang);
        setLangTick((n) => n + 1);
      } else {
        const storedLang = localStorage.getItem('sr_lang');
        if (storedLang) {
          setLanguage(storedLang);
          setLangTick((n) => n + 1);
        }
      }
    } catch (e) {
      const lang = detectLanguage(languageCode);
      setLanguage(lang);
      setLangTick((n) => n + 1);
    }
  }, [languageCode]);

  // Load persisted selections
  useEffect(() => {
    try {
      const sId = localStorage.getItem('sr_stadiumId');
      const zId = localStorage.getItem('sr_zoneId');
      if (sId) setStadiumId(sId);
      if (zId) setZoneId(zId);
    } catch (e) {}
  }, []);

  const refreshUserStatus = useCallback(async () => {
    if (!rawInitData) return;
    try {
      const res = await getUserStatus(rawInitData);
      if (res) {
        setIsMember(res.member);
        setFreeRideAvailable(res.freeRideAvailable);
        setJoinLink(res.joinLink);
      }
    } catch (err) {
      console.error('[App] Failed to refresh user status:', err);
    }
  }, [rawInitData]);

  // Check active ride status on mount
  useEffect(() => {
    const checkActiveRide = async () => {
      if (!rawInitData) return;
      try {
        const res = await getActiveRide(rawInitData);
        if (res && res.active) {
          setActiveRideData(res.ride);
          setAppState('riding');
        } else if (res && res.queued) {
          setStadiumId(res.stadiumId);
          setZoneId(res.zoneId);
          setAppState('waiting');
        }
      } catch (err) {
        console.error('[App] Failed to check active ride:', err);
      }
    };
    checkActiveRide();
    refreshUserStatus();
  }, [rawInitData, refreshUserStatus]);

  // Fetch dynamic config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/config`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.matchFeeStars) {
            setMatchFee(data.matchFeeStars);
          }
          if (data.promoActive !== undefined) {
            setPromoActive(data.promoActive);
          }
          if (data.promotionEndDate) {
            setPromotionEndDate(data.promotionEndDate);
          }
        }

        const stUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/stadiums`;
        const stRes = await fetch(stUrl);
        if (stRes.ok) {
          const stData = await stRes.json();
          setStadiums(stData.STADIUMS || []);
          setStadiumGroups(stData.STADIUM_GROUPS || []);
        }
      } catch (err) {
        console.error('[App] Failed to fetch config/stadiums:', err);
      }
    };
    fetchConfig();
  }, []);

  // Reset zone when stadium changes
  const handleStadiumChange = useCallback((id) => {
    setStadiumId(id);
    setZoneId('');
    setCustomDestination('');
    setError('');
    try {
      localStorage.setItem('sr_stadiumId', id);
      localStorage.removeItem('sr_zoneId');
    } catch(e) {}
  }, []);

  const handleZoneChange = useCallback((id) => {
    setZoneId(id);
    setCustomDestination('');
    setError('');
    try {
      localStorage.setItem('sr_zoneId', id);
    } catch(e) {}
  }, []);

  // ── Payment Flow ─────────────────────────────────────────────────────────
  const handleFindMatch = useCallback(async () => {
    if (!stadiumId || !zoneId) return;

    if (!isMember) {
      setShowJoinModal(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create invoice on backend (or bypass if free first ride)
      const resData = await createInvoice(stadiumId, zoneId, rawInitData, customDestination);

      if (resData.free) {
        setAppState('waiting');
        setFreeRideAvailable(false); // consume locally immediately
        // Haptic feedback
        try {
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        } catch { /* ignore */ }
        return;
      }

      const { invoiceUrl } = resData;

      // 2. Open Stars payment via TMA SDK
      let paymentStatus = 'paid'; // default for dev

      try {
        const { invoice } = await import('@telegram-apps/sdk');
        if (invoice && invoice.open) {
          paymentStatus = await invoice.open(invoiceUrl, 'url');
        }
      } catch (sdkErr) {
        console.warn('[App] Invoice SDK not available, simulating payment:', sdkErr);
        // In dev mode, treat as paid
      }

      switch (paymentStatus) {
        case 'paid':
          // Move to waiting state
          setAppState('waiting');
          // Haptic feedback
          try {
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
          } catch { /* ignore */ }
          break;

        case 'cancelled':
          // User cancelled — stay on selection, no error
          break;

        case 'failed':
          // Insufficient Stars or payment error
          setShowStarsModal(true);
          break;

        case 'pending':
          setError(t('payment_pending') || 'Processing payment...');
          break;

        default:
          setError(t('error'));
      }
    } catch (err) {
      console.error('[App] Payment error:', err);
      if (err.message === 'not_member') {
        setJoinLink(err.data?.joinLink || 'https://t.me/SplitRide26');
        setShowJoinModal(true);
      } else if (err.message === 'blacklisted') {
        setError(t('blacklisted_message', { hours: '72' }));
      } else if (err.message === 'already_in_queue') {
        setError(t('already_in_queue'));
        setAppState('waiting');
      } else {
        // Show actual error for debugging
        setError(err.message || t('error'));
      }
    } finally {
      setLoading(false);
    }
  }, [stadiumId, zoneId, rawInitData, customDestination]);

  // ── Match Found ──────────────────────────────────────────────────────────
  const handleMatched = useCallback((status) => {
    setMatchData(status);
    setAppState('matched');

    // Haptic feedback
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    } catch { /* ignore */ }
  }, []);

  // ── Timeout / Retry ──────────────────────────────────────────────────────
  const handleTimeout = useCallback(() => {
    setAppState('selecting');
    setStadiumId('');
    setZoneId('');
    setCustomDestination('');
    setMatchData(null);
    setError('');
    refreshUserStatus();
  }, [refreshUserStatus]);

  // ── Language Change ──────────────────────────────────────────────────────
  const handleLanguageChange = useCallback(() => {
    setLangTick((n) => n + 1);
  }, []);

  // ── Tab Change ───────────────────────────────────────────────────────────
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    // Haptic feedback
    try {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    } catch { /* ignore */ }
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  const isFormComplete = stadiumId && zoneId && (zoneId !== 'custom' || customDestination.trim() !== '');

  return (
    <div className="min-h-viewport flex flex-col bg-tg-bg relative overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <SplitRideLogo size={28} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-tg-text leading-none">
              SPLIT<span className="text-emerald-400">RIDE</span>
            </h1>
            <p className="text-[10px] text-tg-hint font-medium tracking-wider uppercase">
              World Cup 2026
            </p>
          </div>
        </div>
        <LanguageSwitcher onLanguageChange={handleLanguageChange} />
      </header>

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-red-500/90 text-white text-xs font-bold px-5 py-2.5 flex items-center justify-center gap-2 animate-slide-down shadow-md z-50">
          <span>⚠️</span>
          <span>{t('offline_message') || 'You are offline. Please check your internet connection.'}</span>
        </div>
      )}

      {/* Membership Banner */}
      {!isMember && appState === 'selecting' && !showOnboarding && (
        <div className="bg-blue-600/20 border-b border-blue-500/30 px-5 py-3 animate-slide-down z-40">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-blue-100 flex-1 leading-tight">
              ⚠️ {t('join_banner_text') || 'Join our Telegram Group to use SplitRide.'}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  try {
                    window.Telegram?.WebApp?.openTelegramLink(joinLink) || window.open(joinLink, '_blank');
                  } catch { window.open(joinLink, '_blank'); }
                }}
                className="text-[11px] bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600 active:scale-95 transition-all"
              >
                {t('join_banner_btn') || 'Join'}
              </button>
              <button 
                onClick={refreshUserStatus}
                className="text-[11px] bg-white/10 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-white/20 active:scale-95 transition-all"
              >
                {t('verify_banner_btn') || 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col px-5 pb-20 overflow-y-auto">
        {activeTab === 'ride' && (
          <>
            {appState === 'selecting' && (
              <div className="flex-1 flex flex-col">
                {/* Subtitle */}
                <div className="text-center mt-3 mb-6 animate-fade-in">
                  <h2 className="text-base font-semibold text-tg-text mb-1">
                    {t('app_subtitle')}
                  </h2>
                  <p className="text-xs text-tg-hint">
                    ⚽ FIFA World Cup 2026™
                  </p>
                </div>

                {promoActive && <PromoBanner promotionEndDate={promotionEndDate} />}

                {/* Selectors */}
                <div className="space-y-5 mb-6">
                  <StadiumSelector
                    value={stadiumId}
                    onChange={handleStadiumChange}
                    disabled={loading}
                    stadiums={stadiums}
                    stadiumGroups={stadiumGroups}
                  />

                  {stadiumId && (
                    <ZoneSelector
                      stadiumId={stadiumId}
                      value={zoneId}
                      onChange={handleZoneChange}
                      customValue={customDestination}
                      onCustomChange={setCustomDestination}
                      disabled={loading}
                      stadiums={stadiums}
                    />
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-slide-up">
                    <p className="text-sm text-red-400 text-center">{error}</p>
                  </div>
                )}

                {/* Spacer to push button down */}
                <div className="flex-1 min-h-[20px]" />

                {/* Match Button */}
                <MatchButton
                  onPress={handleFindMatch}
                  disabled={!isFormComplete}
                  loading={loading}
                  fee={matchFee}
                  free={freeRideAvailable}
                  promoActive={promoActive}
                />
              </div>
            )}

            {appState === 'waiting' && (
              <StatusScreen
                stadiumId={stadiumId}
                zoneId={zoneId}
                rawInitData={rawInitData}
                isFree={freeRideAvailable || promoActive}
                onTimeout={handleTimeout}
                onMatched={handleMatched}
              />
            )}

            {appState === 'matched' && (
              <MatchedScreen
                matchData={matchData}
                onContinue={async () => {
                  setLoading(true);
                  try {
                    const res = await getActiveRide(rawInitData);
                    if (res && res.active) {
                      setActiveRideData(res.ride);
                      setAppState('riding');
                    } else {
                      setAppState('selecting');
                    }
                  } catch (err) {
                    console.error('[App] Failed to fetch matched ride:', err);
                    setAppState('selecting');
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            )}

            {appState === 'riding' && activeRideData && (
              <ActiveRideScreen
                rideData={activeRideData}
                rawInitData={rawInitData}
                onCompleted={() => {
                  setAppState('selecting');
                  setStadiumId('');
                  setZoneId('');
                  setCustomDestination('');
                  setActiveRideData(null);
                  setMatchData(null);
                  refreshUserStatus();
                }}
              />
            )}
          </>
        )}

        {activeTab === 'history' && (
          <HistoryTab rawInitData={rawInitData} />
        )}
      </main>

      {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ── Join Group Modal ─────────────────────────────────────────────── */}
      {showJoinModal && (
        <JoinGroupModal
          joinLink={joinLink}
          onClose={() => setShowJoinModal(false)}
          onConfirm={() => {
            setShowJoinModal(false);
            handleFindMatch();
          }}
        />
      )}

      {/* ── Insufficient Stars Modal ─────────────────────────────────────── */}
      {showStarsModal && (
        <InsufficientStarsModal
          amount={matchFee}
          onClose={() => setShowStarsModal(false)}
        />
      )}

      {/* ── Onboarding Modal ─────────────────────────────────────────────── */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            try {
              localStorage.setItem('sr_onboarded', 'true');
            } catch (e) { /* ignore */ }
            setShowOnboarding(false);
          }}
        />
      )}

      {/* ── Background Gradient Orbs ────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl" />
      </div>
    </div>
  );
}
