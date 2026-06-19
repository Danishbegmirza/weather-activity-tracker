/**
 * Centralized scoring thresholds configuration.
 * These values control how weather conditions map to activity scores.
 * 
 * Externalizing these makes them:
 * - Self-documenting (names explain what each threshold means)
 * - Tunable without code changes (can be loaded from env/file)
 * - Testable with different configurations
 * - Reviewable by non-engineers (PMs can suggest changes)
 */

export interface SkiingThresholds {
  /** Wind speed (km/h) at which ski lifts close for safety */
  dangerousWindSpeed: number;
  /** Minimum temperature (°C) above which snow conditions become poor */
  meltingTempMin: number;
  /** Max temp (°C) for excellent freezing conditions */
  excellentTempMax: number;
  /** Max temp (°C) for acceptable skiing */
  acceptableTempMax: number;
  /** Base score for excellent conditions */
  excellentBaseScore: number;
  /** Min temp (°C) below which extreme cold penalty applies */
  extremeColdTempMin: number;
  /** Maximum penalty for extreme cold */
  extremeColdMaxPenalty: number;
  /** Snowfall bonus multiplier (points per cm) */
  snowBonusPerCm: number;
  /** Maximum snowfall bonus */
  maxSnowBonus: number;
  /** Rain penalty multiplier (points per mm) */
  rainPenaltyPerMm: number;
  /** Maximum rain penalty */
  maxRainPenalty: number;
}

export interface SurfingThresholds {
  /** Wave height (m) below which waves are too flat */
  flatWaveHeight: number;
  /** Wave height (m) for small/beginner waves */
  smallWaveHeight: number;
  /** Wave height (m) for optimal surfing */
  optimalWaveHeightMin: number;
  optimalWaveHeightMax: number;
  /** Wave height (m) for challenging big waves */
  largeWaveHeightMax: number;
  /** Wave period (s) thresholds */
  shortPeriodMax: number;
  averagePeriodMax: number;
  excellentPeriodMax: number;
  /** Wind speed (km/h) above which conditions become choppy */
  windPenaltyThreshold: number;
  /** Wind penalty multiplier */
  windPenaltyMultiplier: number;
  /** Max wind penalty */
  maxWindPenalty: number;
  /** Air temperature (°C) below which it's uncomfortably cold */
  coldAirTemp: number;
  /** Air temperature (°C) above which it's pleasantly warm */
  warmAirTemp: number;
}

export interface OutdoorSightseeingThresholds {
  /** Ideal temperature range (°C) */
  idealTempMin: number;
  idealTempMax: number;
  /** Good temperature range */
  goodTempMin: number;
  goodTempMax: number;
  /** Acceptable temperature range */
  acceptableTempMin: number;
  acceptableTempMax: number;
  /** Extreme temperature limits */
  extremeColdTemp: number;
  extremeHotTemp: number;
  /** Precipitation penalty multiplier (points per mm) */
  precipPenaltyPerMm: number;
  /** Maximum precipitation penalty */
  maxPrecipPenalty: number;
  /** Wind speed (km/h) above which penalty applies */
  windPenaltyThreshold: number;
  /** Wind penalty multiplier */
  windPenaltyMultiplier: number;
  /** Maximum wind penalty */
  maxWindPenalty: number;
}

export interface IndoorSightseeingThresholds {
  /** Base score for indoor activities */
  baseScore: number;
  /** Bonus for rainy/stormy weather */
  rainyBonus: number;
  /** Bonus for snowy weather */
  snowyBonus: number;
  /** Precipitation (mm) threshold for wet weather bonus */
  wetWeatherThreshold: number;
  /** Temperature (°C) threshold for cold weather bonus */
  coldWeatherTemp: number;
  /** Temperature (°C) threshold for hot weather bonus */
  hotWeatherTemp: number;
  /** Temperature bonus amount */
  temperatureBonus: number;
  /** Penalty for perfect outdoor weather */
  niceWeatherPenalty: number;
  /** Minimum score bound */
  minScore: number;
  /** Maximum score bound */
  maxScore: number;
}

export interface ScoringConfig {
  skiing: SkiingThresholds;
  surfing: SurfingThresholds;
  outdoorSightseeing: OutdoorSightseeingThresholds;
  indoorSightseeing: IndoorSightseeingThresholds;
}

/**
 * Default scoring configuration.
 * These values are based on empirical research and can be tuned.
 */
export const defaultScoringConfig: ScoringConfig = {
  skiing: {
    dangerousWindSpeed: 50,
    meltingTempMin: 2,
    excellentTempMax: 0,
    acceptableTempMax: 5,
    excellentBaseScore: 85,
    extremeColdTempMin: -15,
    extremeColdMaxPenalty: 30,
    snowBonusPerCm: 5,
    maxSnowBonus: 25,
    rainPenaltyPerMm: 15,
    maxRainPenalty: 50,
  },
  surfing: {
    flatWaveHeight: 0.4,
    smallWaveHeight: 1.0,
    optimalWaveHeightMin: 1.0,
    optimalWaveHeightMax: 2.5,
    largeWaveHeightMax: 4.0,
    shortPeriodMax: 6,
    averagePeriodMax: 9,
    excellentPeriodMax: 15,
    windPenaltyThreshold: 20,
    windPenaltyMultiplier: 1.2,
    maxWindPenalty: 30,
    coldAirTemp: 12,
    warmAirTemp: 22,
  },
  outdoorSightseeing: {
    idealTempMin: 18,
    idealTempMax: 25,
    goodTempMin: 15,
    goodTempMax: 30,
    acceptableTempMin: 10,
    acceptableTempMax: 35,
    extremeColdTemp: -5,
    extremeHotTemp: 45,
    precipPenaltyPerMm: 12,
    maxPrecipPenalty: 60,
    windPenaltyThreshold: 20,
    windPenaltyMultiplier: 1.0,
    maxWindPenalty: 25,
  },
  indoorSightseeing: {
    baseScore: 70,
    rainyBonus: 15,
    snowyBonus: 12,
    wetWeatherThreshold: 2,
    coldWeatherTemp: 8,
    hotWeatherTemp: 30,
    temperatureBonus: 10,
    niceWeatherPenalty: 15,
    minScore: 30,
    maxScore: 95,
  },
};

let currentConfig: ScoringConfig = { ...defaultScoringConfig };

/**
 * Get the current scoring configuration.
 */
export function getScoringConfig(): ScoringConfig {
  return currentConfig;
}

/**
 * Update the scoring configuration (for testing or runtime changes).
 */
export function setScoringConfig(config: Partial<ScoringConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
  };
}

/**
 * Reset to default configuration.
 */
export function resetScoringConfig(): void {
  currentConfig = { ...defaultScoringConfig };
}
