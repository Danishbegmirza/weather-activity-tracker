export interface City {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone: string;
}

export interface WeatherMetrics {
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  rainSum: number;
  snowfallSum: number;
  windSpeedMax: number;
  weatherCode: number;
  relativeHumidityMax?: number;
  waveHeightMax?: number | null;
  wavePeriodMax?: number | null;
}

export interface DailyScore {
  date: string;
  score: number;
  reasoning: string;
  metrics: WeatherMetrics;
}

export interface ActivityRanking {
  /** Stable identifier for the activity (used for lookups and GraphQL) */
  id: string;
  /** Human-readable display name */
  name: string;
  overallScore: number;
  dailyScores: DailyScore[];
}

export interface ActivityRankingResponse {
  city: City;
  rankings: ActivityRanking[];
}

export interface RawWeatherResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    rain_sum: number[];
    snowfall_sum: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
    relative_humidity_2m_max?: number[];
  };
}

export interface RawMarineResponse {
  daily?: {
    time: string[];
    wave_height_max: (number | null)[];
    wave_period_max: (number | null)[];
  };
}
