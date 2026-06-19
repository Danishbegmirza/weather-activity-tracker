import { WeatherMetrics } from '../types';

/**
 * Reason codes for structured scoring results.
 * Using codes instead of string matching prevents brittle logic
 * that breaks when display text changes.
 */
export enum ReasonCode {
  // General
  PERFECT_CONDITIONS = 'PERFECT_CONDITIONS',
  MODERATE_CONDITIONS = 'MODERATE_CONDITIONS',
  SUB_OPTIMAL_CONDITIONS = 'SUB_OPTIMAL_CONDITIONS',
  
  // Weather
  RAINY_STORMY = 'RAINY_STORMY',
  SNOWY = 'SNOWY',
  WET_WEATHER = 'WET_WEATHER',
  COLD_WEATHER = 'COLD_WEATHER',
  HOT_WEATHER = 'HOT_WEATHER',
  NICE_WEATHER_OUTSIDE = 'NICE_WEATHER_OUTSIDE',
  THUNDERSTORMS = 'THUNDERSTORMS',
  FOGGY = 'FOGGY',
  OVERCAST = 'OVERCAST',
  SUNNY_CLEAR = 'SUNNY_CLEAR',
  
  // Skiing
  DANGEROUS_WINDS = 'DANGEROUS_WINDS',
  TOO_WARM = 'TOO_WARM',
  FRESH_SNOW = 'FRESH_SNOW',
  RAINFALL = 'RAINFALL',
  EXTREME_COLD = 'EXTREME_COLD',
  MELTING_FREEZING = 'MELTING_FREEZING',
  
  // Surfing
  NO_OCEAN_DATA = 'NO_OCEAN_DATA',
  FLAT_WAVES = 'FLAT_WAVES',
  SMALL_WAVES = 'SMALL_WAVES',
  OPTIMAL_WAVES = 'OPTIMAL_WAVES',
  LARGE_WAVES = 'LARGE_WAVES',
  DANGEROUS_SWELLS = 'DANGEROUS_SWELLS',
  SHORT_PERIOD = 'SHORT_PERIOD',
  AVERAGE_PERIOD = 'AVERAGE_PERIOD',
  EXCELLENT_PERIOD = 'EXCELLENT_PERIOD',
  LONG_PERIOD = 'LONG_PERIOD',
  WINDY = 'WINDY',
  COLD_AIR = 'COLD_AIR',
  
  // Outdoor
  PRECIPITATION = 'PRECIPITATION',
  GUSTY_WINDS = 'GUSTY_WINDS',
  CHILLY = 'CHILLY',
  
  // Indoor
  INDOOR_RELIABLE = 'INDOOR_RELIABLE',
}

export interface StructuredReason {
  code: ReasonCode;
  text: string;
}

export interface ScoringResult {
  score: number;
  reasoning: string;
  reasons: StructuredReason[];
}

export interface ActivityScoringStrategy {
  /** Stable identifier - used for lookups and GraphQL values */
  id: string;
  /** Human-readable display label - can be changed without breaking logic */
  label: string;
  /** @deprecated Use `id` for lookups and `label` for display */
  name: string;
  computeScore(metrics: WeatherMetrics): ScoringResult;
}
