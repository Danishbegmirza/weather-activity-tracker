import { WeatherMetrics } from '../types';
import { ActivityScoringStrategy, ScoringResult, StructuredReason, ReasonCode } from './types';

export class SkiingStrategy implements ActivityScoringStrategy {
  readonly id = 'skiing';
  readonly label = 'Skiing';
  readonly name = 'Skiing'; // deprecated, kept for backward compatibility

  computeScore(metrics: WeatherMetrics): ScoringResult {
    const { tempMax, tempMin, snowfallSum, rainSum, windSpeedMax } = metrics;
    const reasons: StructuredReason[] = [];

    // 1. Critical safety/operational checks
    if (windSpeedMax >= 50) {
      const text = `Dangerous high winds (max ${windSpeedMax.toFixed(1)} km/h). Ski lifts are likely closed for safety.`;
      return {
        score: 0,
        reasoning: text,
        reasons: [{ code: ReasonCode.DANGEROUS_WINDS, text }],
      };
    }

    if (tempMin > 2) {
      const text = `Too warm. Minimum temperature of ${tempMin.toFixed(1)}°C prevents snow creation and leads to rapid melting.`;
      return {
        score: 0,
        reasoning: text,
        reasons: [{ code: ReasonCode.TOO_WARM, text }],
      };
    }

    // 2. Base temperature score
    let baseScore = 0;
    if (tempMax <= 0) {
      baseScore = 85;
    } else if (tempMax <= 5) {
      baseScore = 85 - ((tempMax - 0) / 5) * 65;
    } else {
      baseScore = 0;
    }

    // Apply comfort penalty for extreme cold (below -15°C)
    if (tempMin < -15) {
      const coldPenalty = Math.min(30, Math.abs(tempMin + 15) * 2);
      baseScore = Math.max(0, baseScore - coldPenalty);
    }

    // 3. Snowfall bonus (powder day!)
    let snowBonus = 0;
    if (snowfallSum > 0) {
      snowBonus = Math.min(25, snowfallSum * 5);
    }

    // 4. Rain penalty (rain is terrible for skiing)
    let rainPenalty = 0;
    if (rainSum > 0) {
      rainPenalty = Math.min(50, rainSum * 15);
    }

    // 5. Calculate final score
    let score = Math.round(baseScore + snowBonus - rainPenalty);
    score = Math.max(0, Math.min(100, score));

    // Construct structured reasons
    if (snowfallSum > 0) {
      reasons.push({
        code: ReasonCode.FRESH_SNOW,
        text: `Fresh snow (${snowfallSum.toFixed(1)} cm) improves conditions.`,
      });
    }
    if (rainSum > 0) {
      reasons.push({
        code: ReasonCode.RAINFALL,
        text: `Rainfall (${rainSum.toFixed(1)} mm) degrades the snow quality.`,
      });
    }
    if (tempMin < -15) {
      reasons.push({
        code: ReasonCode.EXTREME_COLD,
        text: `Extremely cold temperatures (min ${tempMin.toFixed(1)}°C) require heavy gear.`,
      });
    }
    if (tempMax > 0 && tempMin <= 0) {
      reasons.push({
        code: ReasonCode.MELTING_FREEZING,
        text: `Daytime melting (max ${tempMax.toFixed(1)}°C) and nighttime freezing may cause icy patches.`,
      });
    }
    if (score >= 80 && reasons.length === 0) {
      reasons.push({
        code: ReasonCode.PERFECT_CONDITIONS,
        text: 'Perfect sub-freezing temperatures for skiing.',
      });
    }
    if (score > 0 && score < 40 && reasons.length === 0) {
      reasons.push({
        code: ReasonCode.SUB_OPTIMAL_CONDITIONS,
        text: 'Sub-optimal, slushy conditions.',
      });
    }
    if (reasons.length === 0) {
      reasons.push({
        code: ReasonCode.MODERATE_CONDITIONS,
        text: 'Moderate skiing conditions.',
      });
    }

    const reasoning = reasons.map((r) => r.text).join(' ');

    return { score, reasoning, reasons };
  }
}
