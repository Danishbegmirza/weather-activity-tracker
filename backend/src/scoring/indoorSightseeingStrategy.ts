import { WeatherMetrics } from '../types';
import { ActivityScoringStrategy, ScoringResult, StructuredReason, ReasonCode } from './types';

export class IndoorSightseeingStrategy implements ActivityScoringStrategy {
  readonly id = 'indoor-sightseeing';
  readonly label = 'Indoor Sightseeing';
  readonly name = 'Indoor Sightseeing'; // deprecated, kept for backward compatibility

  computeScore(metrics: WeatherMetrics): ScoringResult {
    const { tempMax, precipitationSum, weatherCode } = metrics;

    // 1. Establish base score
    let score = 70;
    const reasons: StructuredReason[] = [{
      code: ReasonCode.INDOOR_RELIABLE,
      text: 'Indoor activities are reliable regardless of weather.',
    }];
    
    // Track which bad weather reasons we've added (using code-based lookup)
    const badWeatherCodes: ReasonCode[] = [];

    // 2. Increase desirability if outdoor weather is bad
    // Rainy/Snowy/Stormy
    if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82) || weatherCode >= 95) {
      score += 15;
      badWeatherCodes.push(ReasonCode.RAINY_STORMY);
      reasons.push({
        code: ReasonCode.RAINY_STORMY,
        text: 'Rainy/stormy outdoor conditions make visiting museums, galleries, and indoor sights highly attractive.',
      });
    } else if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) {
      score += 12;
      badWeatherCodes.push(ReasonCode.SNOWY);
      reasons.push({
        code: ReasonCode.SNOWY,
        text: 'Snowy conditions outside encourage cozy indoor tours.',
      });
    }

    // Heavy precipitation
    if (precipitationSum > 2) {
      const precipBonus = Math.min(10, Math.round(precipitationSum * 2));
      score += precipBonus;
      if (badWeatherCodes.length === 0) {
        badWeatherCodes.push(ReasonCode.WET_WEATHER);
        reasons.push({
          code: ReasonCode.WET_WEATHER,
          text: `Wet weather (${precipitationSum.toFixed(1)} mm) makes indoor visits preferable.`,
        });
      }
    }

    // Extreme temperatures
    if (tempMax < 8) {
      score += 10;
      badWeatherCodes.push(ReasonCode.COLD_WEATHER);
      reasons.push({
        code: ReasonCode.COLD_WEATHER,
        text: `Cold weather outside (max ${tempMax.toFixed(1)}°C) makes heated indoor venues appealing.`,
      });
    } else if (tempMax > 30) {
      score += 10;
      badWeatherCodes.push(ReasonCode.HOT_WEATHER);
      reasons.push({
        code: ReasonCode.HOT_WEATHER,
        text: `Hot weather outside (max ${tempMax.toFixed(1)}°C) makes air-conditioned indoor sights a great escape.`,
      });
    }

    // 3. Discount desirability if outdoor weather is absolutely perfect
    const isNiceWeather = tempMax >= 18 && tempMax <= 25 && precipitationSum === 0 && weatherCode <= 2;
    if (isNiceWeather) {
      score -= 15;
      reasons.push({
        code: ReasonCode.NICE_WEATHER_OUTSIDE,
        text: 'Beautiful sunny weather outside makes outdoor sightseeing a preferred choice, but indoor options remain solid.',
      });
    }

    // 4. Bound the score between 30 and 95
    score = Math.max(30, Math.min(95, score));

    // 5. Select primary reasoning using structured codes (NOT string matching)
    // reasons[0] is always defined since we push INDOOR_RELIABLE at the start
    const defaultReason = reasons[0]!;
    let primaryReason: StructuredReason = defaultReason;
    
    if (badWeatherCodes.length > 0) {
      // Find the first bad weather reason by code
      const badReasonCodes = [
        ReasonCode.RAINY_STORMY,
        ReasonCode.SNOWY,
        ReasonCode.WET_WEATHER,
        ReasonCode.COLD_WEATHER,
        ReasonCode.HOT_WEATHER,
      ];
      const foundBadReason = reasons.find((r) => badReasonCodes.includes(r.code));
      if (foundBadReason) {
        primaryReason = foundBadReason;
      }
    } else if (isNiceWeather) {
      const niceReason = reasons.find((r) => r.code === ReasonCode.NICE_WEATHER_OUTSIDE);
      if (niceReason) {
        primaryReason = niceReason;
      }
    }

    return { 
      score, 
      reasoning: primaryReason.text,
      reasons,
    };
  }
}
