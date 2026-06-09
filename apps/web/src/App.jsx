import { useState, useCallback, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram.js';
import { t, detectLanguage, setLanguage } from './i18n/index.js';
import { createInvoice } from './api/client.js';
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
  const [showStarsModal, setShowStarsModal] = useState(false);
  const [, setLangTick] = useState(0); // force re-render on language change

  // Initialize language from Telegram user
  useEffect(() => {
    const lang = detectLanguage(languageCode);
    setLanguage(lang);
    setLangTick((n) => n + 1);
  }, [languageCode]);

  // Reset zone when stadium changes
  const handleStadiumChange = useCallback((id) => {
    setStadiumId(id);
    setZoneId('');
    setCustomDestination('');
    setError('');
  }, []);

  const handleZoneChange = useCallback((id) => {
    setZoneId(id);
    setCustomDestination('');
    setError('');
  }, []);

  // ── Payment Flow ─────────────────────────────────────────────────────────
  const handleFindMatch = useCallback(async () => {
    if (!stadiumId || !zoneId) return;

    setLoading(true);
    setError('');

    try {
      // 1. Create invoice on backend
      const { invoiceUrl } = await createInvoice(stadiumId, zoneId, rawInitData, customDestination);

      // 2. Open Stars payment via TMA SDK
      let paymentStatus = 'paid'; // default for dev

      try {
        const { invoice } = await import('@telegram-apps/sdk');
        if (invoice.open.isAvailable()) {
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
      if (err.message === 'blacklisted') {
        setError(t('blacklisted_message', { hours: '72' }));
      } else if (err.message === 'already_in_queue') {
        setError(t('already_in_queue'));
        setAppState('waiting');
      } else {
        setError(t('error'));
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
  }, []);

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

                {/* Selectors */}
                <div className="space-y-5 mb-6">
                  <StadiumSelector
                    value={stadiumId}
                    onChange={handleStadiumChange}
                    disabled={loading}
                  />
                  <ZoneSelector
                    stadiumId={stadiumId}
                    value={zoneId}
                    onChange={handleZoneChange}
                    customText={customDestination}
                    onCustomTextChange={setCustomDestination}
                    disabled={loading}
                  />
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
                />
              </div>
            )}

            {appState === 'waiting' && (
              <StatusScreen
                stadiumId={stadiumId}
                zoneId={zoneId}
                rawInitData={rawInitData}
                onTimeout={handleTimeout}
                onMatched={handleMatched}
              />
            )}

            {appState === 'matched' && (
              <MatchedScreen matchData={matchData} />
            )}
          </>
        )}

        {activeTab === 'history' && (
          <HistoryTab rawInitData={rawInitData} />
        )}
      </main>

      {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ── Insufficient Stars Modal ─────────────────────────────────────── */}
      {showStarsModal && (
        <InsufficientStarsModal
          amount={150}
          onClose={() => setShowStarsModal(false)}
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
