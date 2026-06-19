import React from 'react';
import { Snowflake, Waves, Camera, Landmark } from 'lucide-react';
import { ActivityRanking, DailyScore } from '../types';

interface RankingDashboardProps {
  rankings: ActivityRanking[];
  selectedActivityId: string | null;
  onSelectActivity: (id: string) => void;
}

export const RankingDashboard: React.FC<RankingDashboardProps> = ({
  rankings,
  selectedActivityId,
  onSelectActivity,
}) => {
  // Helper to get corresponding Lucide icon
  const getActivityIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'skiing':
        return <Snowflake className="activity-icon" size={24} style={{ color: 'var(--accent-skiing)' }} />;
      case 'surfing':
        return <Waves className="activity-icon" size={24} style={{ color: 'var(--accent-surfing)' }} />;
      case 'outdoor sightseeing':
        return <Camera className="activity-icon" size={24} style={{ color: 'var(--accent-outdoor)' }} />;
      case 'indoor sightseeing':
        return <Landmark className="activity-icon" size={24} style={{ color: 'var(--accent-indoor)' }} />;
      default:
        return <Camera className="activity-icon" size={24} />;
    }
  };

  // Helper to determine score color category
  const getScoreClass = (score: number) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-moderate';
    return 'score-bad';
  };

  /**
   * Format date into readable text (e.g. "Mon, Jun 18")
   * Appends T00:00:00 to parse date strings as local time, not UTC.
   * Without this, "2026-06-18" parses as UTC midnight, causing
   * negative-UTC timezone users to see the previous day.
   */
  const formatReadableDate = (dateStr: string) => {
    try {
      const localDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
      const date = new Date(localDateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-rankings animate-fade-in">
      <div className="section-header">
        <h2>Recommended Activities</h2>
        <span className="subtitle">Ranked by weather desirability for the next 7 days</span>
      </div>

      <div className="rankings-grid">
        {rankings.map((activity, index) => {
          const isSelected = selectedActivityId === activity.id;
          const overallScore = activity.overallScore;

          // Find the best day for this activity
          const bestDay: DailyScore = activity.dailyScores.reduce(
            (best, cur) => (cur.score > best.score ? cur : best),
            activity.dailyScores[0]
          );

          // Get the weather summary/reasoning for the best day
          const summaryText = bestDay.score > 0 
            ? `Best day: ${formatReadableDate(bestDay.date)} (${bestDay.score}%) — ${bestDay.reasoning}`
            : 'Conditions are sub-optimal all week.';

          return (
            <div
              key={activity.id}
              className={`activity-card glass ${isSelected ? 'active-card' : ''}`}
              onClick={() => onSelectActivity(activity.id)}
              id={`activity-card-${activity.id}`}
            >
              <div className="card-top">
                <div className="activity-title-wrapper">
                  <div className="activity-icon-container">
                    {getActivityIcon(activity.name)}
                  </div>
                  <div>
                    <h3>{activity.name}</h3>
                    <span className="rank-badge">#{index + 1} Recommendation</span>
                  </div>
                </div>
                <div className={`score-badge ${getScoreClass(overallScore)}`}>
                  {overallScore}%
                </div>
              </div>

              <div className="card-body">
                <p className="best-day-recommendation">
                  {summaryText}
                </p>
              </div>

              <div className="card-footer">
                <div className="sparkline-container">
                  {activity.dailyScores.map((day) => (
                    <div
                      key={day.date}
                      className="sparkline-bar"
                      style={{
                        height: `${Math.max(10, day.score)}%`,
                        backgroundColor: day.score >= 80 
                          ? 'var(--score-excellent)' 
                          : day.score >= 60 
                            ? 'var(--score-good)' 
                            : day.score >= 40 
                              ? 'var(--score-moderate)' 
                              : 'var(--score-bad)',
                      }}
                      title={`${formatReadableDate(day.date)}: ${day.score}%`}
                    />
                  ))}
                </div>
                <span className="sparkline-label">7-day trend</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default RankingDashboard;
