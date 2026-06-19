import { SkiingStrategy } from './skiingStrategy';
import { SurfingStrategy } from './surfingStrategy';
import { OutdoorSightseeingStrategy } from './outdoorSightseeingStrategy';
import { IndoorSightseeingStrategy } from './indoorSightseeingStrategy';
import { ScoringEngine } from './index';
import { WeatherMetrics } from '../types';
import { ReasonCode } from './types';

describe('Activity Scoring Strategies', () => {
  describe('SkiingStrategy', () => {
    const strategy = new SkiingStrategy();

    test('should have correct id and label', () => {
      expect(strategy.id).toBe('skiing');
      expect(strategy.label).toBe('Skiing');
    });

    test('should return 0 if wind speed is 50 km/h or higher (dangerous conditions)', () => {
      const metrics: WeatherMetrics = {
        tempMax: -5,
        tempMin: -10,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 5,
        windSpeedMax: 52,
        weatherCode: 71,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBe(0);
      expect(result.reasoning).toContain('Dangerous high winds');
      expect(result.reasons.some(r => r.code === ReasonCode.DANGEROUS_WINDS)).toBe(true);
    });

    test('should return 0 if min temp is above 2°C (melting)', () => {
      const metrics: WeatherMetrics = {
        tempMax: 8,
        tempMin: 3,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 10,
        weatherCode: 3,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBe(0);
      expect(result.reasoning).toContain('Too warm');
      expect(result.reasons.some(r => r.code === ReasonCode.TOO_WARM)).toBe(true);
    });

    test('should score highly on a fresh sub-freezing powder day', () => {
      const metrics: WeatherMetrics = {
        tempMax: -2,
        tempMin: -8,
        precipitationSum: 5,
        rainSum: 0,
        snowfallSum: 5,
        windSpeedMax: 10,
        weatherCode: 71,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.reasoning).toContain('Fresh snow');
      expect(result.reasons.some(r => r.code === ReasonCode.FRESH_SNOW)).toBe(true);
    });

    test('should penalize rain heavily', () => {
      const metrics: WeatherMetrics = {
        tempMax: 1,
        tempMin: -2,
        precipitationSum: 6,
        rainSum: 4,
        snowfallSum: 0,
        windSpeedMax: 12,
        weatherCode: 61,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBeLessThan(50);
      expect(result.reasoning).toContain('Rainfall');
      expect(result.reasons.some(r => r.code === ReasonCode.RAINFALL)).toBe(true);
    });
  });

  describe('SurfingStrategy', () => {
    const strategy = new SurfingStrategy();

    test('should have correct id and label', () => {
      expect(strategy.id).toBe('surfing');
      expect(strategy.label).toBe('Surfing');
    });

    test('should return 0 if wave data is null (landlocked)', () => {
      const metrics: WeatherMetrics = {
        tempMax: 22,
        tempMin: 15,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 10,
        weatherCode: 0,
        waveHeightMax: null,
        wavePeriodMax: null,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBe(0);
      expect(result.reasoning).toContain('not available at this location');
      expect(result.reasons.some(r => r.code === ReasonCode.NO_OCEAN_DATA)).toBe(true);
    });

    test('should score highly under perfect swell conditions', () => {
      const metrics: WeatherMetrics = {
        tempMax: 24,
        tempMin: 18,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 10,
        weatherCode: 1,
        waveHeightMax: 1.8,
        wavePeriodMax: 12,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.reasoning).toContain('Optimal wave height');
      expect(result.reasoning).toContain('Excellent long-period groundswell');
      expect(result.reasons.some(r => r.code === ReasonCode.OPTIMAL_WAVES)).toBe(true);
      expect(result.reasons.some(r => r.code === ReasonCode.EXCELLENT_PERIOD)).toBe(true);
    });

    test('should penalize flat conditions', () => {
      const metrics: WeatherMetrics = {
        tempMax: 24,
        tempMin: 18,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 8,
        weatherCode: 0,
        waveHeightMax: 0.2,
        wavePeriodMax: 5,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBeLessThan(30);
      expect(result.reasoning).toContain('too flat');
      expect(result.reasons.some(r => r.code === ReasonCode.FLAT_WAVES)).toBe(true);
    });
  });

  describe('OutdoorSightseeingStrategy', () => {
    const strategy = new OutdoorSightseeingStrategy();

    test('should have correct id and label', () => {
      expect(strategy.id).toBe('outdoor-sightseeing');
      expect(strategy.label).toBe('Outdoor Sightseeing');
    });

    test('should score perfect (100) on a sunny, warm, calm day', () => {
      const metrics: WeatherMetrics = {
        tempMax: 22,
        tempMin: 14,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 8,
        weatherCode: 0,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBe(100);
      expect(result.reasoning).toContain('Sunny, clear skies');
      expect(result.reasons.some(r => r.code === ReasonCode.SUNNY_CLEAR)).toBe(true);
    });

    test('should score very low on a rainy, stormy day', () => {
      const metrics: WeatherMetrics = {
        tempMax: 12,
        tempMin: 8,
        precipitationSum: 15,
        rainSum: 15,
        snowfallSum: 0,
        windSpeedMax: 35,
        weatherCode: 95,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBeLessThan(15);
      expect(result.reasoning).toContain('Thunderstorms detected');
      expect(result.reasons.some(r => r.code === ReasonCode.THUNDERSTORMS)).toBe(true);
    });

    test('should penalize high humidity on hot days', () => {
      const metrics: WeatherMetrics = {
        tempMax: 32,
        tempMin: 25,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 10,
        weatherCode: 1,
        relativeHumidityMax: 90,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBeLessThan(80);
      expect(result.reasoning).toContain('humidity');
    });
  });

  describe('IndoorSightseeingStrategy', () => {
    const strategy = new IndoorSightseeingStrategy();

    test('should have correct id and label', () => {
      expect(strategy.id).toBe('indoor-sightseeing');
      expect(strategy.label).toBe('Indoor Sightseeing');
    });

    test('should decrease desirability if the weather outside is perfect', () => {
      const metrics: WeatherMetrics = {
        tempMax: 22,
        tempMin: 14,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 8,
        weatherCode: 0,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBeLessThan(70);
      expect(result.reasoning).toContain('Beautiful sunny weather outside makes outdoor sightseeing a preferred choice');
      expect(result.reasons.some(r => r.code === ReasonCode.NICE_WEATHER_OUTSIDE)).toBe(true);
    });

    test('should increase desirability on a cold, rainy day', () => {
      const metrics: WeatherMetrics = {
        tempMax: 6,
        tempMin: 2,
        precipitationSum: 8,
        rainSum: 8,
        snowfallSum: 0,
        windSpeedMax: 15,
        weatherCode: 61,
      };
      const result = strategy.computeScore(metrics);
      expect(result.score).toBeGreaterThan(80);
      expect(result.reasoning).toContain('Rainy/stormy outdoor conditions');
      expect(result.reasons.some(r => r.code === ReasonCode.RAINY_STORMY)).toBe(true);
    });
  });
});

describe('ScoringEngine', () => {
  let engine: ScoringEngine;

  beforeEach(() => {
    engine = new ScoringEngine();
  });

  test('should register all default strategies', () => {
    const ids = engine.getStrategyIds();
    expect(ids).toContain('skiing');
    expect(ids).toContain('surfing');
    expect(ids).toContain('outdoor-sightseeing');
    expect(ids).toContain('indoor-sightseeing');
  });

  test('should compute rankings with correct structure', () => {
    const metrics: WeatherMetrics[] = [
      {
        tempMax: 22,
        tempMin: 14,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 8,
        weatherCode: 0,
        waveHeightMax: 1.5,
        wavePeriodMax: 10,
      },
    ];
    const dates = ['2026-06-19'];

    const rankings = engine.computeRankings(metrics, dates);

    expect(rankings.length).toBe(4);
    rankings.forEach((ranking) => {
      expect(ranking).toHaveProperty('id');
      expect(ranking).toHaveProperty('name');
      expect(ranking).toHaveProperty('overallScore');
      expect(ranking).toHaveProperty('dailyScores');
      expect(ranking.dailyScores.length).toBe(1);
    });
  });

  test('should return rankings sorted by score descending', () => {
    const metrics: WeatherMetrics[] = [
      {
        tempMax: 22,
        tempMin: 14,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 8,
        weatherCode: 0,
        waveHeightMax: null,
        wavePeriodMax: null,
      },
    ];
    const dates = ['2026-06-19'];

    const rankings = engine.computeRankings(metrics, dates);

    for (let i = 0; i < rankings.length - 1; i++) {
      const current = rankings[i];
      const next = rankings[i + 1];
      if (current && next) {
        expect(current.overallScore).toBeGreaterThanOrEqual(next.overallScore);
      }
    }
  });

  test('should compute correct average score over multiple days', () => {
    const metrics: WeatherMetrics[] = [
      {
        tempMax: 22,
        tempMin: 14,
        precipitationSum: 0,
        rainSum: 0,
        snowfallSum: 0,
        windSpeedMax: 8,
        weatherCode: 0,
      },
      {
        tempMax: 12,
        tempMin: 8,
        precipitationSum: 10,
        rainSum: 10,
        snowfallSum: 0,
        windSpeedMax: 30,
        weatherCode: 63,
      },
    ];
    const dates = ['2026-06-19', '2026-06-20'];

    const rankings = engine.computeRankings(metrics, dates);
    const outdoorRanking = rankings.find((r) => r.id === 'outdoor-sightseeing');

    expect(outdoorRanking).toBeDefined();
    expect(outdoorRanking!.dailyScores.length).toBe(2);
    
    const day1 = outdoorRanking!.dailyScores[0];
    const day2 = outdoorRanking!.dailyScores[1];
    expect(day1).toBeDefined();
    expect(day2).toBeDefined();
    
    const day1Score = day1!.score;
    const day2Score = day2!.score;
    const expectedAverage = Math.round((day1Score + day2Score) / 2);
    
    expect(outdoorRanking!.overallScore).toBe(expectedAverage);
  });

  test('should allow registering and deregistering strategies', () => {
    const initialCount = engine.getStrategyIds().length;
    
    engine.deregisterStrategy('skiing');
    expect(engine.getStrategyIds().length).toBe(initialCount - 1);
    expect(engine.getStrategy('skiing')).toBeUndefined();
    
    engine.registerStrategy(new SkiingStrategy());
    expect(engine.getStrategyIds().length).toBe(initialCount);
    expect(engine.getStrategy('skiing')).toBeDefined();
  });
});
