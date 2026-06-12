import React from 'react';
import { t } from '../i18n/index.js';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-tg-bg text-center relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-3xl glass-light flex items-center justify-center mb-6 border border-red-500/20 text-4xl shadow-xl shadow-red-500/10">
            ⚠️
          </div>
          
          <h1 className="text-2xl font-extrabold text-tg-text mb-3 tracking-tight">
            {t('error_boundary_title') || 'Something went wrong'}
          </h1>
          
          <p className="text-sm text-tg-hint mb-8 max-w-xs leading-relaxed">
            {t('error_boundary_desc') || 'We encountered an unexpected error. Please try reloading the app.'}
          </p>

          <button
            onClick={this.handleReload}
            className="w-full max-w-xs py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/20 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('error_boundary_cta') || 'Reload App'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
