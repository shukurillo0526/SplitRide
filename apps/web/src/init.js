import { init, miniApp, themeParams, viewport, mockTelegramEnv } from '@telegram-apps/sdk';

/**
 * Initialize the Telegram Mini App.
 *
 * The core auth works via telegram-web-app.js (loaded in index.html).
 * The SDK is used only for advanced features like invoice.open() and CSS vars.
 * If the SDK fails, the app still works — initData comes from window.Telegram.WebApp.
 */
export function initTelegramApp() {
  // ── Step 1: Tell Telegram the app is ready (always works) ────────────────
  try {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      console.log('[Init] WebApp.ready() called, initData length:', window.Telegram.WebApp.initData?.length || 0);
    }
  } catch (e) {
    console.warn('[Init] WebApp.ready() failed:', e);
  }

  // ── Step 2: Mock environment for local development ───────────────────────
  if (import.meta.env.DEV && !window.Telegram?.WebApp?.initData) {
    try {
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
    } catch (e) {
      console.warn('[Init] Mock env failed:', e);
    }
  }

  // ── Step 3: Init SDK for CSS vars and invoice (non-critical) ─────────────
  try {
    init();
    console.log('[Init] SDK initialized');
  } catch (e) {
    console.warn('[Init] SDK init failed (non-critical, app still works):', e);
    return; // CSS vars won't bind but app still functions
  }

  // Mount components for CSS variable binding (each independently)
  try {
    if (!miniApp.isMounted()) miniApp.mount();
    miniApp.bindCssVars();
  } catch (e) { console.warn('[Init] miniApp CSS vars failed:', e); }

  try {
    if (!themeParams.isMounted()) themeParams.mount();
    themeParams.bindCssVars();
  } catch (e) { console.warn('[Init] themeParams CSS vars failed:', e); }

  try {
    if (!viewport.isMounted() && !viewport.isMounting()) {
      viewport.mount().then(() => viewport.bindCssVars()).catch(() => {});
    }
  } catch (e) { console.warn('[Init] viewport CSS vars failed:', e); }
}
