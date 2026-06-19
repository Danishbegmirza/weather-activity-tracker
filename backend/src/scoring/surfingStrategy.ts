import { WeatherMetrics } from '../types';
import { ActivityScoringStrategy, ScoringResult, StructuredReason, ReasonCode } from './types';

export class SurfingStrategy implements ActivityScoringStrategy {
  readonly id = 'surfing';
  readonly label = 'Surfing';
  readonly name = 'Surfing'; // deprecated, kept for backward compatibility

  computeScore(metrics: WeatherMetrics): ScoringResult {
    const { waveHeightMax, wavePeriodMax, windSpeedMax, tempMax } = metrics;
    const reasons: StructuredReason[] = [];

    // 1. Inland or no wave data
    if (waveHeightMax === null || waveHeightMax === undefined || wavePeriodMax === null || wavePeriodMax === undefined) {
      const text = 'Surfing is not available at this location (no ocean wave data found).';
      return {
        score: 0,
        reasoning: text,
        reasons: [{ code: ReasonCode.NO_OCEAN_DATA, text }],
      };
    }

    // 2. Compute base score from wave height
    let heightScore = 0;
    let heightReason: StructuredReason;

    if (waveHeightMax < 0.4) {
      heightScore = 15;
      heightReason = {
        code: ReasonCode.FLAT_WAVES,
        text: 'Waves are too flat for surfing.',
      };
    } else if (waveHeightMax < 1.0) {
      heightScore = 40 + ((waveHeightMax - 0.4) / 0.6) * 30;
      heightReason = {
        code: ReasonCode.SMALL_WAVES,
        text: `Small waves (${waveHeightMax.toFixed(2)}m) suitable for longboards or beginners.`,
      };
    } else if (waveHeightMax <= 2.5) {
      heightScore = 85 + ((waveHeightMax - 1.0) / 1.5) * 15;
      heightReason = {
        code: ReasonCode.OPTIMAL_WAVES,
        text: `Optimal wave height (${waveHeightMax.toFixed(2)}m) for standard surfing.`,
      };
    } else if (waveHeightMax <= 4.0) {
      heightScore = 80 - ((waveHeightMax - 2.5) / 1.5) * 20;
      heightReason = {
        code: ReasonCode.LARGE_WAVES,
        text: `Large waves (${waveHeightMax.toFixed(2)}m) best for advanced surfers.`,
      };
    } else {
      heightScore = 20;
      heightReason = {
        code: ReasonCode.DANGEROUS_SWELLS,
        text: `Dangerous, heavy swells (${waveHeightMax.toFixed(2)}m) with potential stormy conditions.`,
      };
    }
    reasons.push(heightReason);

    // 3. Period multiplier
    let periodMultiplier = 1.0;
    let periodReason: StructuredReason;

    if (wavePeriodMax < 6) {
      periodMultiplier = 0.5;
      periodReason = {
        code: ReasonCode.SHORT_PERIOD,
        text: 'Short swell period causes choppy, weak waves.',
      };
    } else if (wavePeriodMax < 9) {
      periodMultiplier = 0.85;
      periodReason = {
        code: ReasonCode.AVERAGE_PERIOD,
        text: 'Average swell period, clean but moderate waves.',
      };
    } else if (wavePeriodMax <= 15) {
      periodMultiplier = 1.0;
      periodReason = {
        code: ReasonCode.EXCELLENT_PERIOD,
        text: `Excellent long-period groundswell (${wavePeriodMax.toFixed(1)}s).`,
      };
    } else {
      periodMultiplier = 0.9;
      periodReason = {
        code: ReasonCode.LONG_PERIOD,
        text: `Extremely long-period swell (${wavePeriodMax.toFixed(1)}s) may create heavy, surging waves.`,
      };
    }
    reasons.push(periodReason);

    let rawScore = heightScore * periodMultiplier;

    // 4. Wind penalty (onshore winds can ruin surf quality)
    if (windSpeedMax > 20) {
      const windPenalty = Math.min(30, (windSpeedMax - 20) * 1.2);
      rawScore -= windPenalty;
      reasons.push({
        code: ReasonCode.WINDY,
        text: `Windy conditions (${windSpeedMax.toFixed(1)} km/h) may cause choppy water.`,
      });
    }

    // 5. Air temperature adjustment
    if (tempMax < 12) {
      rawScore -= 15;
      reasons.push({
        code: ReasonCode.COLD_AIR,
        text: 'Cold air temperatures.',
      });
    } else if (tempMax > 22) {
      rawScore += 5;
    }

    // 6. Final score calculation
    let score = Math.round(rawScore);
    score = Math.max(0, Math.min(100, score));

    const reasoning = reasons.map((r) => r.text).join(' ');

    return { score, reasoning, reasons };
  }
}
