import { t } from '../i18n/index.js';
import { STADIUM_GROUPS } from '../data/stadiums.js';

export default function StadiumSelector({ value, onChange, disabled }) {
  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <label className="flex items-center gap-2 text-sm font-semibold text-tg-hint mb-2 px-1">
        <span className="text-lg">🏟️</span>
        {t('select_stadium')}
      </label>
      <div className="select-wrapper">
        <select
          id="stadium-selector"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="custom-select"
        >
          <option value="">{t('select_stadium_placeholder')}</option>
          {STADIUM_GROUPS.map((group) => (
            <optgroup key={group.country} label={`${group.emoji} ${group.country}`}>
              {group.stadiums.map((stadium) => (
                <option key={stadium.id} value={stadium.id}>
                  {stadium.emoji} {stadium.name} — {stadium.city}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}
