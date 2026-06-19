import React, { useState } from 'react';
import { Thermometer, CloudRain, Wind, Waves, Snowflake, Calendar } from 'lucide-react';
import { DailyScore } from '../types';

interface DailyBreakdownProps {
  activityName: string;
  dailyScores: DailyScore[];
}

// Map WMO codes to readable text and emojis
export const getWeatherCondition = (code: number): { text: string; emoji: string } => {
  if (code === 0) return { text: 'Clear Sky', emoji: '☀️' };
  if (code === 1) return { text: 'Mainly Clear', emoji: '🌤️' };
  if (code === 2) return { text: 'Partly Cloudy', emoji: '⛅' };
  if (code === 3) return { text: 'Overcast', emoji: '☁️' };
  if (code === 45 || code === 48) return { text: 'Foggy', emoji: '🌫️' };
  if (code >= 51 && code <= 57) return { text: 'Drizzle', emoji: '🌦️' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { text: 'Rainy', emoji: '🌧️' };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { text: 'Snowy', emoji: '🌨️' };
  if (code >= 95) return { text: 'Thunderstorms', emoji: '⛈️' };
  return { text: 'Unknown Weather', emoji: '🌦️' };
};

export const DailyBreakdown: React.FC<DailyBreakdownProps> = ({
  activityName,
  dailyScores,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const selectedDay = dailyScores[selectedDayIndex];

  /**
   * Format date for display.
   * Appends T00:00:00 to parse date strings as local time, not UTC.
   * Without this, "2026-06-18" parses as UTC midnight, causing
   * negative-UTC timezone users to see the previous day.
   */
  const formatDateLabel = (dateStr: string, style: 'short' | 'long') => {
    try {
      const localDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
      const date = new Date(localDateStr);
      if (style === 'short') {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      }
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--score-excellent)';
    if (score >= 60) return 'var(--score-good)';
    if (score >= 40) return 'var(--score-moderate)';
    return 'var(--score-bad)';
  };

  // Setup SVG coordinates for custom chart
  const chartWidth = 500;
  const chartHeight = 150;
  const padding = 25;
  const usableWidth = chartWidth - padding * 2;
  const usableHeight = chartHeight - padding * 2;

  // Calculate points
  const points = dailyScores.map((day, idx) => {
    const x = padding + (idx / (dailyScores.length - 1)) * usableWidth;
    // In SVG, y=0 is at the top, so we subtract from usableHeight
    const y = padding + usableHeight - (day.score / 100) * usableHeight;
    return { x, y, score: day.score, date: day.date };
  });

  // SVG paths
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  return (
    <div className="daily-breakdown-container glass animate-fade-in" style={{ marginTop: '2rem' }}>
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={20} style={{ color: 'var(--primary)' }} />
          <h2>7-Day Breakdown for {activityName}</h2>
        </div>
        <span className="subtitle">Select a day below to explore meteorological correlations</span>
      </div>

      {/* Custom SVG Line Chart */}
      <div className="chart-wrapper glass">
        <div className="chart-title">Desirability Trend (%)</div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="trend-svg">
          <defs>
            <linearGradient id="chart-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chart-line-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(255,255,255,0.05)" />
          <line x1={padding} y1={padding + usableHeight / 2} x2={chartWidth - padding} y2={padding + usableHeight / 2} stroke="rgba(255,255,255,0.05)" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255,255,255,0.1)" />

          {/* Y Axis Labels */}
          <text x={padding - 5} y={padding + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">100</text>
          <text x={padding - 5} y={padding + usableHeight / 2 + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">50</text>
          <text x={padding - 5} y={chartHeight - padding + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">0</text>

          {/* Gradient Fill under Line */}
          <path d={areaPath} fill="url(#chart-area-gradient)" />

          {/* Main Trend Line */}
          <path d={linePath} fill="none" stroke="url(#chart-line-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Nodes */}
          {points.map((p, idx) => {
            const isSelected = selectedDayIndex === idx;
            return (
              <g key={p.date} className="chart-node" onClick={() => setSelectedDayIndex(idx)}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 6 : 4}
                  fill={isSelected ? 'var(--text-primary)' : 'var(--bg-color)'}
                  stroke={getScoreColor(p.score)}
                  strokeWidth={isSelected ? 3 : 2}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                />
                {/* Node Value Label */}
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="600"
                  fill="var(--text-primary)"
                  style={{ pointerEvents: 'none' }}
                >
                  {p.score}%
                </text>
                {/* X Axis Label */}
                <text
                  x={p.x}
                  y={chartHeight - padding + 15}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isSelected ? 'var(--text-primary)' : 'var(--text-muted)'}
                  fontWeight={isSelected ? '600' : '400'}
                  style={{ pointerEvents: 'none' }}
                >
                  {formatDateLabel(p.date, 'short')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 7-Day Navigation Grid */}
      <div className="daily-navigation-grid">
        {dailyScores.map((day, idx) => {
          const isSelected = selectedDayIndex === idx;
          const condition = getWeatherCondition(day.metrics.weatherCode);

          return (
            <button
              key={day.date}
              className={`daily-nav-btn glass ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedDayIndex(idx)}
              style={{ borderLeftColor: getScoreColor(day.score), borderLeftWidth: '4px' }}
              id={`daily-nav-btn-${idx}`}
            >
              <span className="nav-day">{formatDateLabel(day.date, 'short')}</span>
              <span className="nav-emoji" title={condition.text}>{condition.emoji}</span>
              <span className="nav-score" style={{ color: getScoreColor(day.score) }}>{day.score}%</span>
            </button>
          );
        })}
      </div>

      {/* Selected Day Technical Weather Details Drawer */}
      {selectedDay && (
        <div className="day-details-panel glass animate-fade-in" key={selectedDay.date}>
          <div className="panel-header">
            <h3>{formatDateLabel(selectedDay.date, 'long')} Details</h3>
            <div className="panel-badge-wrapper">
              <span className="weather-desc">
                {getWeatherCondition(selectedDay.metrics.weatherCode).emoji} {getWeatherCondition(selectedDay.metrics.weatherCode).text}
              </span>
              <span
                className="score-badge"
                style={{
                  backgroundColor: `rgba(255, 255, 255, 0.05)`,
                  color: getScoreColor(selectedDay.score),
                  border: `1px solid ${getScoreColor(selectedDay.score)}`,
                }}
              >
                {selectedDay.score}% Desirability
              </span>
            </div>
          </div>

          <p className="panel-reasoning">
            <strong>Analysis: </strong> {selectedDay.reasoning}
          </p>

          <div className="metrics-grid">
            {/* Temp Metric */}
            <div className="metric-item glass">
              <Thermometer size={18} className="metric-icon" style={{ color: '#f87171' }} />
              <div className="metric-label-val">
                <span className="metric-label">Temperature</span>
                <span className="metric-value">
                  {selectedDay.metrics.tempMin.toFixed(1)}°C to {selectedDay.metrics.tempMax.toFixed(1)}°C
                </span>
              </div>
            </div>

            {/* Precipitation Metric */}
            <div className="metric-item glass">
              <CloudRain size={18} className="metric-icon" style={{ color: '#60a5fa' }} />
              <div className="metric-label-val">
                <span className="metric-label">Precipitation</span>
                <span className="metric-value">
                  {selectedDay.metrics.precipitationSum.toFixed(1)} mm
                  {selectedDay.metrics.rainSum > 0 && ` (${selectedDay.metrics.rainSum.toFixed(1)}mm rain)`}
                </span>
              </div>
            </div>

            {/* Wind Metric */}
            <div className="metric-item glass">
              <Wind size={18} className="metric-icon" style={{ color: '#94a3b8' }} />
              <div className="metric-label-val">
                <span className="metric-label">Wind Speed</span>
                <span className="metric-value">
                  Max {selectedDay.metrics.windSpeedMax.toFixed(1)} km/h
                </span>
              </div>
            </div>

            {/* Snowfall Metric (Only show if there is snow or it's freezing) */}
            {(selectedDay.metrics.snowfallSum > 0 || selectedDay.metrics.tempMin <= 2) && (
              <div className="metric-item glass">
                <Snowflake size={18} className="metric-icon" style={{ color: '#38bdf8' }} />
                <div className="metric-label-val">
                  <span className="metric-label">Fresh Snowfall</span>
                  <span className="metric-value">
                    {selectedDay.metrics.snowfallSum.toFixed(1)} cm
                  </span>
                </div>
              </div>
            )}

            {/* Wave Metrics (Only show if wave data exists e.g. for surfing) */}
            {selectedDay.metrics.waveHeightMax !== null && selectedDay.metrics.waveHeightMax !== undefined && (
              <div className="metric-item glass">
                <Waves size={18} className="metric-icon" style={{ color: '#2dd4bf' }} />
                <div className="metric-label-val">
                  <span className="metric-label">Ocean Swell</span>
                  <span className="metric-value">
                    {selectedDay.metrics.waveHeightMax.toFixed(2)}m @ {selectedDay.metrics.wavePeriodMax?.toFixed(1)}s
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default DailyBreakdown;
