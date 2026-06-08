/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        tg: {
          bg: 'var(--tg-theme-bg-color, #0a0a0a)',
          text: 'var(--tg-theme-text-color, #ffffff)',
          hint: 'var(--tg-theme-hint-color, #7a7a7a)',
          link: 'var(--tg-theme-link-color, #5eaaef)',
          button: 'var(--tg-theme-button-color, #5eaaef)',
          'button-text': 'var(--tg-theme-button-text-color, #ffffff)',
          'secondary-bg': 'var(--tg-theme-secondary-bg-color, #1a1a1a)',
          'header-bg': 'var(--tg-theme-header-bg-color, #0a0a0a)',
          'accent-text': 'var(--tg-theme-accent-text-color, #5eaaef)',
          'section-bg': 'var(--tg-theme-section-bg-color, #1a1a1a)',
          'section-header': 'var(--tg-theme-section-header-text-color, #7a7a7a)',
          subtitle: 'var(--tg-theme-subtitle-text-color, #7a7a7a)',
          destructive: 'var(--tg-theme-destructive-text-color, #ef5050)',
        },
      },
      height: {
        viewport: 'var(--tg-viewport-stable-height, 100vh)',
      },
      minHeight: {
        viewport: 'var(--tg-viewport-stable-height, 100vh)',
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'bounce-in': 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.7, transform: 'scale(1.05)' },
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(24px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'bounce-in': {
          '0%': { opacity: 0, transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.08)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(16, 185, 129, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
