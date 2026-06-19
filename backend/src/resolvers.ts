import { GraphQLError } from 'graphql';
import { openMeteoService } from './services/openMeteoService';
import { cacheService } from './services/cacheService';
import { ScoringEngine } from './scoring';
import { WeatherMetrics, ActivityRankingResponse } from './types';
import { config } from './config';
import { logger } from './utils/logger';
import {
  validateCitySearch,
  validateActivityRankings,
  ActivityRankingsInput,
} from './utils/validation';
import { ValidationError, ExternalServiceError } from './middleware/errorHandler';

const scoringEngine = new ScoringEngine();

// Cache TTL from config
const CACHE_TTL_MS = config.cache.defaultTtlSeconds * 1000;

export const resolvers = {
  Query: {
    searchCities: async (_parent: unknown, { query }: { query: string }) => {
      try {
        // Validate input
        validateCitySearch({ query });

        logger.debug({ query }, 'Searching cities');
        return await openMeteoService.searchCities(query);
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        if (error instanceof ValidationError) {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        if (error instanceof ExternalServiceError) {
          logger.error(
            { error: error.message, query },
            'External service error in searchCities'
          );
          throw new GraphQLError(error.message, {
            extensions: { code: 'EXTERNAL_SERVICE_ERROR' },
          });
        }
        logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error', query },
          'Error in searchCities resolver'
        );
        throw new GraphQLError('Failed to search cities', {
          extensions: { code: 'INTERNAL_ERROR' },
        });
      }
    },

    getActivityRankings: async (
      _parent: unknown,
      args: ActivityRankingsInput
    ): Promise<ActivityRankingResponse> => {
      try {
        // Validate input
        validateActivityRankings(args);

        const { latitude, longitude, timezone, cityName, country, admin1 } = args;

        logger.debug(
          { latitude, longitude, cityName },
          'Getting activity rankings'
        );

        // Construct a cache key based on coordinates (rounded to 4 decimal places ~11m precision)
        const cacheKey = `rankings_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;

        return await cacheService.getOrFetch(
          cacheKey,
          async () => {
            // Fetch weather and marine forecasts concurrently
            const [weatherData, marineData] = await Promise.all([
              openMeteoService.getWeatherForecast(latitude, longitude, timezone),
              openMeteoService.getMarineForecast(latitude, longitude, timezone),
            ]);

            const dailyWeather = weatherData.daily;
            const dailyMarine = marineData.daily;
            const dates = dailyWeather.time;

            if (!dates || dates.length === 0) {
              throw new GraphQLError('No forecast data available', {
                extensions: { code: 'NO_DATA' },
              });
            }

            // Assemble weather metrics for each forecast day
            // Safe array access with fallbacks for noUncheckedIndexedAccess
            const dailyMetrics: WeatherMetrics[] = dates.map((_date, idx) => {
              const tempMax = dailyWeather.temperature_2m_max[idx] ?? 0;
              const tempMin = dailyWeather.temperature_2m_min[idx] ?? 0;
              const precipitationSum = dailyWeather.precipitation_sum[idx] ?? 0;
              const rainSum = dailyWeather.rain_sum[idx] ?? 0;
              const snowfallSum = dailyWeather.snowfall_sum[idx] ?? 0;
              const windSpeedMax = dailyWeather.wind_speed_10m_max[idx] ?? 0;
              const weatherCode = dailyWeather.weather_code[idx] ?? 0;
              const relativeHumidityMax = dailyWeather.relative_humidity_2m_max?.[idx];

              // Safely fetch marine data (could be null for inland areas)
              const waveHeightMax = dailyMarine?.wave_height_max?.[idx] ?? null;
              const wavePeriodMax = dailyMarine?.wave_period_max?.[idx] ?? null;

              return {
                tempMax,
                tempMin,
                precipitationSum,
                rainSum,
                snowfallSum,
                windSpeedMax,
                weatherCode,
                relativeHumidityMax,
                waveHeightMax,
                wavePeriodMax,
              };
            });

            // Run the scoring engine to evaluate all 4 activities
            const rankings = scoringEngine.computeRankings(dailyMetrics, dates);

            logger.info(
              {
                cityName,
                latitude,
                longitude,
                daysScored: dates.length,
                topActivity: rankings[0]?.name,
                topScore: rankings[0]?.overallScore,
              },
              'Activity rankings computed'
            );

            return {
              city: {
                name: cityName,
                latitude,
                longitude,
                country,
                admin1,
                timezone,
              },
              rankings,
            };
          },
          CACHE_TTL_MS
        );
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        if (error instanceof ValidationError) {
          throw new GraphQLError(error.message, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        if (error instanceof ExternalServiceError) {
          logger.error(
            { error: error.message, args },
            'External service error in getActivityRankings'
          );
          throw new GraphQLError(error.message, {
            extensions: { code: 'EXTERNAL_SERVICE_ERROR' },
          });
        }
        logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            args,
          },
          'Error in getActivityRankings resolver'
        );
        throw new GraphQLError('Failed to get activity rankings', {
          extensions: { code: 'INTERNAL_ERROR' },
        });
      }
    },
  },
};
