import { t } from '../i18n/index.js';
import { getZones } from '../data/stadiums.js';

/**
 * Zone selector with pill-style buttons instead of a dropdown.
 * Groups by icon type (airports, downtown, stations, etc.).
 */

// Icons for different zone types
function getZoneIcon(zoneName) {
  const lower = zoneName.toLowerCase();
  if (lower.includes('airport') || lower.includes('aeropuerto')) return '✈️';
  if (lower.includes('station') || lower.includes('estación')) return '🚉';
  if (lower.includes('downtown') || lower.includes('centro')) return '🏙️';
  if (lower.includes('beach') || lower.includes('playa')) return '🏖️';
  return '📍';
}

export default function ZoneSelector({ stadiumId, value, onChange, customText, onCustomTextChange, disabled }) {
  const zones = stadiumId ? getZones(stadiumId) : [];
  const isDisabled = disabled || !stadiumId;

  if (!stadiumId) return null;

  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
      {/* Label */}
      <label className="flex items-center gap-2 text-sm font-semibold text-tg-hint mb-3 px-1">
        <span className="text-base">📍</span>
        {t('select_zone')}
      </label>

      {/* Zone pills grid */}
      <div className="zone-pills-grid">
        {zones.map((zone) => {
          const isSelected = value === zone.id;
          const icon = getZoneIcon(zone.name);

          return (
            <button
              key={zone.id}
              onClick={() => onChange(zone.id)}
              disabled={isDisabled}
              className={`zone-pill ${isSelected ? 'zone-pill--selected' : ''}`}
            >
              <span className="zone-pill-icon">{icon}</span>
              <span className="zone-pill-label">
                {zone.id === 'custom' ? t('custom_destination') : zone.name}
              </span>
              {isSelected && (
                <div className="zone-pill-check">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom destination text input */}
      {value === 'custom' && (
        <div className="animate-slide-up mt-4">
          <input
            id="custom-destination-input"
            type="text"
            value={customText || ''}
            onChange={(e) => onCustomTextChange(e.target.value)}
            placeholder={t('custom_destination_placeholder')}
            className="custom-dest-input"
            disabled={isDisabled}
          />
        </div>
      )}
    </div>
  );
}
