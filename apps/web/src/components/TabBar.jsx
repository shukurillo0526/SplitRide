import { t } from '../i18n/index.js';
import SplitRideLogo from './SplitRideLogo.jsx';

/**
 * Bottom tab navigation bar — Ride | My Rides
 */
export default function TabBar({ activeTab, onTabChange }) {
  const tabs = [
    {
      id: 'ride',
      label: t('tab_ride') || 'Ride',
      icon: (active) => (
        <SplitRideLogo size={22} className={`transition-all duration-300 ${active ? 'drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'opacity-50 grayscale'}`} />
      ),
    },
    {
      id: 'history',
      label: t('tab_history') || 'My Rides',
      icon: (active) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? '#10b981' : '#6b7280'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="tab-bar">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`tab-bar-item ${isActive ? 'tab-bar-item--active' : ''}`}
          >
            <div className="tab-bar-icon">
              {tab.icon(isActive)}
            </div>
            <span className={`tab-bar-label ${isActive ? 'tab-bar-label--active' : ''}`}>
              {tab.label}
            </span>
            {isActive && <div className="tab-bar-indicator" />}
          </button>
        );
      })}
    </nav>
  );
}
