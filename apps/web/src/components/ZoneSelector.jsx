import { t } from '../i18n/index.js';
import { getZones } from '../data/stadiums.js';

export default function ZoneSelector({ stadiumId, value, onChange, disabled }) {
  const zones = stadiumId ? getZones(stadiumId) : [];
  const isDisabled = disabled || !stadiumId;

  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <label className="flex items-center gap-2 text-sm font-semibold text-tg-hint mb-2 px-1">
        <span className="text-lg">📍</span>
        {t('select_zone')}
      </label>
      <div className="select-wrapper">
        <select
          id="zone-selector"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
          className="custom-select"
        >
          <option value="">{t('select_zone_placeholder')}</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              📍 {zone.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
