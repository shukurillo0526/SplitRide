import { useState } from 'react';
import { t } from '../i18n/index.js';
import { STADIUM_GROUPS, getStadium } from '../data/stadiums.js';

/**
 * Full-page scrollable stadium cards grouped by country.
 * Replaces the old <select> dropdown with a premium card-based UI.
 */

// Country flag SVGs for reliable rendering (emoji flags break on some platforms)
const FLAG_ICONS = {
  USA: () => (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="rounded-[2px] overflow-hidden">
      <rect width="20" height="14" fill="#B22234" />
      <rect y="1.08" width="20" height="1.08" fill="white" />
      <rect y="3.23" width="20" height="1.08" fill="white" />
      <rect y="5.38" width="20" height="1.08" fill="white" />
      <rect y="7.54" width="20" height="1.08" fill="white" />
      <rect y="9.69" width="20" height="1.08" fill="white" />
      <rect y="11.85" width="20" height="1.08" fill="white" />
      <rect width="8" height="7.54" fill="#3C3B6E" />
    </svg>
  ),
  Mexico: () => (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="rounded-[2px] overflow-hidden">
      <rect width="6.67" height="14" fill="#006341" />
      <rect x="6.67" width="6.67" height="14" fill="white" />
      <rect x="13.33" width="6.67" height="14" fill="#CE1126" />
    </svg>
  ),
  Canada: () => (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" className="rounded-[2px] overflow-hidden">
      <rect width="5" height="14" fill="#FF0000" />
      <rect x="5" width="10" height="14" fill="white" />
      <rect x="15" width="5" height="14" fill="#FF0000" />
      <path d="M10 3L10.8 5.5L9.2 5.5L10 3Z" fill="#FF0000" />
      <path d="M10 10L9 7.5H11L10 10Z" fill="#FF0000" />
    </svg>
  ),
};

// Stadium type icons based on city characteristics
const CITY_ICONS = {
  default: '🏟️',
};

export default function StadiumSelector({ value, onChange, disabled }) {
  const [searchQuery, setSearchQuery] = useState('');
  const selectedStadium = value ? getStadium(value) : null;

  const filteredGroups = STADIUM_GROUPS.map((group) => ({
    ...group,
    stadiums: group.stadiums.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.city.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((g) => g.stadiums.length > 0);

  return (
    <div className="stadium-selector animate-slide-up" style={{ animationDelay: '0.1s' }}>
      {/* Section label */}
      <div className="flex items-center justify-between mb-3 px-1">
        <label className="flex items-center gap-2 text-sm font-semibold text-tg-hint">
          <span className="text-base">🏟️</span>
          {t('select_stadium_title') || t('select_stadium')}
        </label>
        {selectedStadium && (
          <button
            onClick={() => onChange('')}
            className="text-xs text-tg-accent-text font-medium hover:underline transition-all"
          >
            Change
          </button>
        )}
      </div>

      {/* Selected stadium badge (when one is selected) */}
      {selectedStadium && (
        <div className="stadium-card stadium-card--selected mb-2">
          <div className="flex items-center gap-3">
            <div className="stadium-card-flag">
              {FLAG_ICONS[selectedStadium.country]?.() || <span>{selectedStadium.emoji}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-tg-text truncate">{selectedStadium.name}</p>
              <p className="text-xs text-emerald-400 font-medium">{selectedStadium.city}</p>
            </div>
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable stadium list (hidden when one is selected) */}
      {!selectedStadium && (
        <>
          {/* Search bar */}
          <div className="relative mb-3">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tg-hint pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stadiums..."
              className="stadium-search"
              disabled={disabled}
            />
          </div>

          {/* Stadium cards */}
          <div className="stadium-list">
            {filteredGroups.map((group) => (
              <div key={group.country} className="mb-4 last:mb-0">
                {/* Country header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-5 h-3.5 flex items-center">
                    {FLAG_ICONS[group.country]?.() || <span className="text-sm">{group.emoji}</span>}
                  </div>
                  <span className="text-xs font-bold text-tg-hint uppercase tracking-wider">
                    {group.country}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Stadium cards */}
                <div className="space-y-1.5">
                  {group.stadiums.map((stadium) => (
                    <button
                      key={stadium.id}
                      onClick={() => {
                        onChange(stadium.id);
                        setSearchQuery('');
                      }}
                      disabled={disabled}
                      className={`stadium-card ${value === stadium.id ? 'stadium-card--selected' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="stadium-card-icon">
                          {CITY_ICONS[stadium.id] || CITY_ICONS.default}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-tg-text truncate">{stadium.name}</p>
                          <p className="text-xs text-tg-hint">{stadium.city}</p>
                        </div>
                        <svg className="w-4 h-4 text-tg-hint/40 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <p className="text-sm text-tg-hint text-center py-6">No stadiums found</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
