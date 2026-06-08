import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { useMemo } from 'react';

/**
 * Custom hook for accessing Telegram user data.
 * Returns user info and raw init data for API authentication.
 */
export function useTelegram() {
  return useMemo(() => {
    try {
      const lp = retrieveLaunchParams();
      const user = lp.initData?.user;
      const rawInitData = lp.initDataRaw || '';

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
    } catch {
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
