import { useMemo } from 'react';
import { retrieveLaunchParams } from '@telegram-apps/sdk';

/**
 * Custom hook for accessing Telegram user data.
 * 
 * PRIMARY: Uses window.Telegram.WebApp (always available in real TG WebView)
 * FALLBACK: Uses @telegram-apps/sdk retrieveLaunchParams
 * LAST RESORT: Dev fallback with dummy data
 */
export function useTelegram() {
  return useMemo(() => {
    // ── Primary: window.Telegram.WebApp (always works in real TG) ──────────
    try {
      const tgWebApp = window.Telegram?.WebApp;
      if (tgWebApp && tgWebApp.initData) {
        const user = tgWebApp.initDataUnsafe?.user;
        console.log('[useTelegram] Using window.Telegram.WebApp, user:', user?.id);
        return {
          userId: user?.id || 0,
          firstName: user?.first_name || 'Fan',
          lastName: user?.last_name || '',
          username: user?.username || '',
          photoUrl: user?.photo_url || '',
          languageCode: user?.language_code || 'en',
          rawInitData: tgWebApp.initData,
          platform: tgWebApp.platform || 'unknown',
          isReady: !!user,
        };
      }
    } catch (e) {
      console.warn('[useTelegram] window.Telegram.WebApp failed:', e);
    }

    // ── Fallback: @telegram-apps/sdk ───────────────────────────────────────
    try {
      const lp = retrieveLaunchParams();
      const user = lp.initData?.user;
      const rawInitData = lp.initDataRaw || '';

      if (rawInitData) {
        console.log('[useTelegram] Using SDK launch params, user:', user?.id);
        return {
          userId: user?.id || 0,
          firstName: user?.firstName || 'Fan',
          lastName: user?.lastName || '',
          username: user?.username || '',
          photoUrl: user?.photoUrl || '',
          languageCode: user?.languageCode || 'en',
          rawInitData,
          platform: lp.platform || 'unknown',
          isReady: !!user,
        };
      }
    } catch (e) {
      console.warn('[useTelegram] SDK retrieveLaunchParams failed:', e);
    }

    // ── Last resort: Dev fallback ──────────────────────────────────────────
    console.warn('[useTelegram] Using dev fallback — no Telegram environment detected');
    return {
      userId: 123456789,
      firstName: 'Dev',
      lastName: 'User',
      username: 'devuser',
      photoUrl: '',
      languageCode: 'en',
      rawInitData: '',
      platform: 'web',
      isReady: true,
    };
  }, []);
}
