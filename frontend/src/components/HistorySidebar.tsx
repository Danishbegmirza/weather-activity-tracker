import React from 'react';
import { History, Trash2, MapPin } from 'lucide-react';
import { City } from '../types';

interface HistorySidebarProps {
  history: City[];
  onSelectCity: (city: City) => void;
  onClearHistory: () => void;
  selectedCity: City | null;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  history,
  onSelectCity,
  onClearHistory,
  selectedCity,
}) => {
  return (
    <aside className="sidebar-container glass animate-slide-in">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <History size={18} className="title-icon" />
          <h3>Recent Searches</h3>
        </div>
        {history.length > 0 && (
          <button
            className="clear-all-btn"
            onClick={onClearHistory}
            title="Clear all search history"
            aria-label="Clear all history"
            id="clear-history-button"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="sidebar-empty">
          <p>No recent searches yet.</p>
          <p className="subtext">Cities you search for will appear here for quick access.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((city, idx) => {
            const isSelected =
              selectedCity &&
              selectedCity.latitude === city.latitude &&
              selectedCity.longitude === city.longitude;

            return (
              <button
                key={`${city.name}-${city.latitude}-${idx}`}
                className={`history-item glass ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectCity(city)}
                id={`history-item-${idx}`}
              >
                <MapPin size={14} className="history-pin-icon" />
                <div className="history-text">
                  <div className="history-city-name">{city.name}</div>
                  <div className="history-city-country">
                    {city.admin1 ? `${city.admin1}, ` : ''}
                    {city.country}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
};
export default HistorySidebar;
