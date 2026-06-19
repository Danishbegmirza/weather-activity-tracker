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
  id: string;
  name: string;
  overallScore: number;
  dailyScores: DailyScore[];
}

export interface ActivityRankingResponse {
  city: City;
  rankings: ActivityRanking[];
}
