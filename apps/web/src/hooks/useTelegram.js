import { retrieveLaunchParams } from '@telegram-apps/sdk';
import { useMemo } from 'react';

/**
 * Custom hook for accessing Telegram user data.
 * Returns user info and raw init data for API authentication.
 *
 * Uses @telegram-apps/sdk directly (not the -react wrapper) for reliability.
 */
export function useTelegram() {
  return useMemo(() => {
    try {
      const lp = retrieveLaunchParams();
      const user = lp.initData?.user;
      const rawInitData = lp.initDataRaw || '';

      console.log('[useTelegram] Launch params retrieved, user:', user?.id, 'hasInitData:', !!rawInitData);

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
    } catch (e) {
      console.warn('[useTelegram] Failed to retrieve launch params, using fallback:', e);
      // Fallback for dev/non-TG environments
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
    }
  }, []);
}
