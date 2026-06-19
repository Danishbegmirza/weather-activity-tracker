import { WeatherMetrics } from '../types';
import { ActivityScoringStrategy, ScoringResult, StructuredReason, ReasonCode } from './types';

export class OutdoorSightseeingStrategy implements ActivityScoringStrategy {
  readonly id = 'outdoor-sightseeing';
  readonly label = 'Outdoor Sightseeing';
  readonly name = 'Outdoor Sightseeing'; // deprecated, kept for backward compatibility

  computeScore(metrics: WeatherMetrics): ScoringResult {
    const { tempMax, precipitationSum, windSpeedMax, weatherCode, relativeHumidityMax } = metrics;
    const reasons: StructuredReason[] = [];

    // 1. Calculate temperature score (Ideal is 18°C to 25°C)
    let tempScore = 0;
    if (tempMax >= 18 && tempMax <= 25) {
      tempScore = 100;
    } else if (tempMax >= 15 && tempMax < 18) {
      tempScore = 80 + ((tempMax - 15) / 3) * 20;
    } else if (tempMax > 25 && tempMax <= 30) {
      tempScore = 100 - ((tempMax - 25) / 5) * 20;
    } else if (tempMax >= 10 && tempMax < 15) {
      tempScore = 50 + ((tempMax - 10) / 5) * 30;
    } else if (tempMax > 30 && tempMax <= 35) {
      tempScore = 80 - ((tempMax - 30) / 5) * 40;
    } else if (tempMax < 10 && tempMax >= -5) {
      tempScore = Math.max(0, ((tempMax - (-5)) / 15) * 50);
    } else if (tempMax > 35 && tempMax <= 45) {
      tempScore = Math.max(0, ((45 - tempMax) / 10) * 40);
    } else {
      tempScore = 0;
    }

    // 2. Weather code multiplier
    let weatherMultiplier = 1.0;
    let weatherReason: StructuredReason;

    if (weatherCode <= 1) {
      weatherMultiplier = 1.0;
      weatherReason = { code: ReasonCode.SUNNY_CLEAR, text: 'Sunny, clear skies.' };
    } else if (weatherCode === 2) {
      weatherMultiplier = 0.95;
      weatherReason = { code: ReasonCode.SUNNY_CLEAR, text: 'Partly cloudy, nice visibility.' };
    } else if (weatherCode === 3) {
      weatherMultiplier = 0.8;
      weatherReason = { code: ReasonCode.OVERCAST, text: 'Overcast, gray skies.' };
    } else if (weatherCode === 45 || weatherCode === 48) {
      weatherMultiplier = 0.6;
      weatherReason = { code: ReasonCode.FOGGY, text: 'Foggy conditions, reducing landmark visibility.' };
    } else if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
      weatherMultiplier = 0.3;
      weatherReason = { code: ReasonCode.RAINY_STORMY, text: 'Rainy weather, making outdoor walking wet and uncomfortable.' };
    } else if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) {
      weatherMultiplier = 0.25;
      weatherReason = { code: ReasonCode.SNOWY, text: 'Snowy conditions, hard to walk around, but could be scenic.' };
    } else if (weatherCode >= 95) {
      weatherMultiplier = 0.05;
      weatherReason = { code: ReasonCode.THUNDERSTORMS, text: 'Thunderstorms detected! Dangerous to be outdoors.' };
    } else {
      weatherReason = { code: ReasonCode.MODERATE_CONDITIONS, text: 'Clear and pleasant sky.' };
    }
    reasons.push(weatherReason);

    let rawScore = tempScore * weatherMultiplier;

    // 3. Precipitation penalty
    if (precipitationSum > 0) {
      const precipPenalty = Math.min(60, precipitationSum * 12);
      rawScore -= precipPenalty;
    }

    // 4. Wind penalty
    if (windSpeedMax > 20) {
      const windPenalty = Math.min(25, (windSpeedMax - 20) * 1.0);
      rawScore -= windPenalty;
    }

    // 5. Humidity comfort adjustment
    if (relativeHumidityMax !== undefined) {
      if (relativeHumidityMax > 85 && tempMax > 25) {
        const humidityPenalty = Math.min(15, (relativeHumidityMax - 85) * 0.5);
        rawScore -= humidityPenalty;
        reasons.push({
          code: ReasonCode.HOT_WEATHER,
          text: `High humidity (${relativeHumidityMax.toFixed(0)}%) makes it feel muggy.`,
        });
      } else if (relativeHumidityMax < 30 && tempMax > 30) {
        rawScore -= 5;
        reasons.push({
          code: ReasonCode.HOT_WEATHER,
          text: `Low humidity and heat may cause discomfort.`,
        });
      }
    }

    // 6. Final score
    let score = Math.round(rawScore);
    score = Math.max(0, Math.min(100, score));

    // Add additional reasons
    if (tempMax > 30) {
      reasons.push({ code: ReasonCode.HOT_WEATHER, text: `Hot temperature (max ${tempMax.toFixed(1)}°C).` });
    } else if (tempMax < 12) {
      reasons.push({ code: ReasonCode.CHILLY, text: `Chilly temperature (max ${tempMax.toFixed(1)}°C).` });
    }
    if (precipitationSum > 0) {
      reasons.push({ code: ReasonCode.PRECIPITATION, text: `Precipitation of ${precipitationSum.toFixed(1)} mm.` });
    }
    if (windSpeedMax > 25) {
      reasons.push({ code: ReasonCode.GUSTY_WINDS, text: `Gusty winds up to ${windSpeedMax.toFixed(1)} km/h.` });
    }

    const reasoning = reasons.map((r) => r.text).join(' ');

    return { score, reasoning, reasons };
  }
}
