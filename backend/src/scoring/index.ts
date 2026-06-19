import { WeatherMetrics, ActivityRanking, DailyScore } from '../types';
import { ActivityScoringStrategy } from './types';
import { SkiingStrategy } from './skiingStrategy';
import { SurfingStrategy } from './surfingStrategy';
import { OutdoorSightseeingStrategy } from './outdoorSightseeingStrategy';
import { IndoorSightseeingStrategy } from './indoorSightseeingStrategy';

export class ScoringEngine {
  private strategies: Map<string, ActivityScoringStrategy> = new Map();

  constructor() {
    // Register default strategies
    this.registerStrategy(new SkiingStrategy());
    this.registerStrategy(new SurfingStrategy());
    this.registerStrategy(new OutdoorSightseeingStrategy());
    this.registerStrategy(new IndoorSightseeingStrategy());
  }

  /**
   * Register a new scoring strategy dynamically.
   * Uses strategy.id as the key for lookups (stable identifier).
   */
  registerStrategy(strategy: ActivityScoringStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Remove a strategy by its id.
   */
  deregisterStrategy(id: string): void {
    this.strategies.delete(id);
  }

  /**
   * Get a strategy by id.
   */
  getStrategy(id: string): ActivityScoringStrategy | undefined {
    return this.strategies.get(id);
  }

  /**
   * Get all registered strategy ids.
   */
  getStrategyIds(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Compute scores for all registered activities across the 7-day forecast.
   * @param dailyMetrics Array of WeatherMetrics for each of the 7 days.
   * @param dates Array of dates corresponding to the 7 days.
   */
  computeRankings(dailyMetrics: WeatherMetrics[], dates: string[]): ActivityRanking[] {
    const rankings: ActivityRanking[] = [];

    for (const [id, strategy] of this.strategies.entries()) {
      const dailyScores: DailyScore[] = [];
      let totalScore = 0;

      for (let i = 0; i < dailyMetrics.length; i++) {
        const metrics = dailyMetrics[i];
        const date = dates[i];
        
        if (!metrics || !date) {
          continue;
        }
        
        const { score, reasoning } = strategy.computeScore(metrics);

        dailyScores.push({
          date,
          score,
          reasoning,
          metrics,
        });

        totalScore += score;
      }

      const overallScore = dailyScores.length > 0 ? Math.round(totalScore / dailyScores.length) : 0;

      rankings.push({
        id,
        name: strategy.label, // Use label for display, id for lookups
        overallScore,
        dailyScores,
      });
    }

    // Return rankings sorted by overallScore descending (most desirable activities first)
    return rankings.sort((a, b) => b.overallScore - a.overallScore);
  }
}
