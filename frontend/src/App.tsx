import React, { useState, useEffect } from 'react';
import { ApolloProvider, useQuery } from '@apollo/client';
import { client } from './graphql/client';
import { GET_ACTIVITY_RANKINGS } from './graphql/queries';
import { SearchBar } from './components/SearchBar';
import { HistorySidebar } from './components/HistorySidebar';
import { RankingDashboard } from './components/RankingDashboard';
import { DailyBreakdown } from './components/DailyBreakdown';
import { ErrorBoundary } from './components/ErrorBoundary';
import { City, ActivityRanking } from './types';
import { CloudSun, Info, Loader2 } from 'lucide-react';

// Default city: Biarritz, France (chosen because it has surfing and weather features)
const DEFAULT_CITY: City = {
  name: 'Biarritz',
  latitude: 43.4806,
  longitude: -1.5568,
  country: 'France',
  admin1: 'New Aquitaine',
  timezone: 'Europe/Paris',
};

const MainDashboard: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<City>(DEFAULT_CITY);
  const [history, setHistory] = useState<City[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Load history from local storage on mount
  useEffect(() => {
    const cachedHistory = localStorage.getItem('aerorank_history');
    if (cachedHistory) {
      try {
        setHistory(JSON.parse(cachedHistory));
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
      }
    }
  }, []);

  // Fetch rankings for the selected city
  const { data, loading, error } = useQuery(GET_ACTIVITY_RANKINGS, {
    variables: {
      latitude: selectedCity.latitude,
      longitude: selectedCity.longitude,
      timezone: selectedCity.timezone,
      cityName: selectedCity.name,
      country: selectedCity.country,
      admin1: selectedCity.admin1 || '',
    },
  });

  // Automatically select the top ranked activity when data loads
  useEffect(() => {
    if (data?.getActivityRankings?.rankings?.length > 0) {
      const topActivity = data.getActivityRankings.rankings[0].id;
      setSelectedActivityId(topActivity);
    }
  }, [data]);

  const handleSelectCity = (city: City) => {
    setSelectedCity(city);
    
    // Add to history (avoid duplicates, cap at 7 items)
    setHistory((prevHistory) => {
      const filtered = prevHistory.filter(
        (c) => c.latitude !== city.latitude || c.longitude !== city.longitude
      );
      const updated = [city, ...filtered].slice(0, 7);
      localStorage.setItem('aerorank_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('aerorank_history');
  };

  const rankings: ActivityRanking[] = data?.getActivityRankings?.rankings || [];
  const activeActivity = rankings.find((a) => a.id === selectedActivityId);

  return (
    <div className="container">
      {/* Header Bar */}
      <header className="header-bar glass animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div className="header-logo-title">
          <div className="logo-glow">
            <CloudSun size={32} className="logo-icon" />
          </div>
          <div>
            <h1>AeroRank</h1>
            <p className="subtitle">Weather-Powered Travel Activity Planner</p>
          </div>
        </div>
        <div className="city-info-pill glass">
          <span className="dot-pulse"></span>
          <span>
            {selectedCity.name}, {selectedCity.admin1 ? `${selectedCity.admin1}, ` : ''}{selectedCity.country}
          </span>
        </div>
      </header>

      {/* Search Bar Section */}
      <div className="search-section animate-fade-in" style={{ marginBottom: '2rem' }}>
        <SearchBar onSelectCity={handleSelectCity} />
      </div>

      {/* Main Grid App Layout */}
      <div className="app-layout">
        {/* Sidebar for Search History */}
        <HistorySidebar
          history={history}
          onSelectCity={handleSelectCity}
          onClearHistory={handleClearHistory}
          selectedCity={selectedCity}
        />

        {/* Dashboard Content */}
        <main className="dashboard-content">
          {loading && (
            <div className="loading-container glass animate-fade-in">
              <Loader2 className="loading-spinner-large" size={48} />
              <p>Analyzing meteorological forecasts...</p>
              <span className="subtext">Evaluating skiing, surfing, and sightseeing models...</span>
            </div>
          )}

          {error && (
            <div className="error-container glass animate-fade-in">
              <h3>Forecast Fetch Failed</h3>
              <p>We couldn't load weather statistics for {selectedCity.name}. Please check your connection or try another city.</p>
              <span className="error-details">{error.message}</span>
            </div>
          )}

          {!loading && !error && rankings.length > 0 && (
            <>
              {/* Rankings Grid */}
              <RankingDashboard
                rankings={rankings}
                selectedActivityId={selectedActivityId}
                onSelectActivity={setSelectedActivityId}
              />

              {/* Day-by-Day breakdown for the highlighted activity */}
              {activeActivity && (
                <DailyBreakdown
                  activityName={activeActivity.name}
                  dailyScores={activeActivity.dailyScores}
                />
              )}
            </>
          )}
        </main>
      </div>
      
      {/* Footer Info */}
      <footer className="app-footer">
        <div className="footer-content">
          <Info size={14} />
          <span>Scores are generated using real-time forecasts from Open-Meteo API. Not for safety-critical planning.</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ApolloProvider client={client}>
      <ErrorBoundary>
        <MainDashboard />
      </ErrorBoundary>
    </ApolloProvider>
  );
};

export default App;
