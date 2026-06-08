import { init, miniApp, themeParams, viewport, mockTelegramEnv } from '@telegram-apps/sdk';

/**
 * Initialize the Telegram Mini App SDK.
 * In dev mode, mocks the Telegram environment for browser testing.
 */
export function initTelegramApp() {
  // Mock environment for local development
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      // Only mock if not already in Telegram
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));

      if (!searchParams.has('tgWebAppData') && !hashParams.has('tgWebAppData')) {
        const initDataRaw = new URLSearchParams({
          user: JSON.stringify({
            id: 123456789,
            first_name: 'Dev',
            last_name: 'User',
            username: 'devuser',
            language_code: 'en',
            is_premium: false,
          }),
          auth_date: Math.floor(Date.now() / 1000).toString(),
          hash: 'dev-hash-placeholder',
          chat_type: 'sender',
          chat_instance: '123456789',
        }).toString();

        mockTelegramEnv({
          launchParams: {
            tgWebAppPlatform: 'web',
            tgWebAppVersion: '8.0',
            tgWebAppData: initDataRaw,
            tgWebAppThemeParams: {
              bg_color: '#0a0a0a',
              text_color: '#ffffff',
              hint_color: '#7a7a7a',
              link_color: '#5eaaef',
              button_color: '#10b981',
              button_text_color: '#ffffff',
              secondary_bg_color: '#1a1a1a',
              header_bg_color: '#0a0a0a',
              accent_text_color: '#5eaaef',
              section_bg_color: '#1a1a1a',
              section_header_text_color: '#7a7a7a',
              subtitle_text_color: '#7a7a7a',
              destructive_text_color: '#ef5050',
            },
          },
        });
      }
    } catch (e) {
      console.warn('[Init] Mock env setup failed:', e);
    }
  }

  // Initialize the SDK
  try {
    init();
  } catch (e) {
    console.warn('[Init] SDK init failed:', e);
    return;
  }

  // Mount and bind CSS variables for each module
  try {
    if (miniApp.mount.isAvailable()) {
      miniApp.mount();
      miniApp.bindCssVars();
    }
  } catch (e) {
    console.warn('[Init] miniApp mount failed:', e);
  }

  try {
    if (themeParams.mount.isAvailable()) {
      themeParams.mount();
      themeParams.bindCssVars();
    }
  } catch (e) {
    console.warn('[Init] themeParams mount failed:', e);
  }

  try {
    if (viewport.mount.isAvailable()) {
      viewport.mount().then(() => {
        viewport.bindCssVars();
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('[Init] viewport mount failed:', e);
  }
}
