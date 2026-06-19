import { z } from 'zod';
import { City, RawWeatherResponse, RawMarineResponse } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExternalServiceError } from '../middleware/errorHandler';

const FORECAST_DAYS = config.openMeteo.forecastDays;
const TIMEOUT_MS = config.openMeteo.timeoutMs;
const MAX_RETRIES = config.openMeteo.maxRetries;
const RETRY_DELAY_MS = config.openMeteo.retryDelayMs;

// Zod schemas for upstream API response validation
const GeocodingResultSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional().default(''),
  admin1: z.string().optional().default(''),
  timezone: z.string().optional().default('UTC'),
});

const GeocodingResponseSchema = z.object({
  results: z.array(GeocodingResultSchema).optional(),
});

const WeatherDailySchema = z.object({
  time: z.array(z.string()),
  temperature_2m_max: z.array(z.number()),
  temperature_2m_min: z.array(z.number()),
  precipitation_sum: z.array(z.number()),
  rain_sum: z.array(z.number()),
  snowfall_sum: z.array(z.number()),
  wind_speed_10m_max: z.array(z.number()),
  weather_code: z.array(z.number()),
  relative_humidity_2m_max: z.array(z.number()).optional(),
});

const WeatherResponseSchema = z.object({
  daily: WeatherDailySchema,
});

const MarineDailySchema = z.object({
  time: z.array(z.string()),
  wave_height_max: z.array(z.number().nullable()),
  wave_period_max: z.array(z.number().nullable()),
});

const MarineResponseSchema = z.object({
  daily: MarineDailySchema.optional(),
});

export class OpenMeteoService {
  private readonly geocodingUrl: string;
  private readonly forecastUrl: string;
  private readonly marineUrl: string;
  private readonly maxSearchResults: number;

  constructor() {
    this.geocodingUrl = config.openMeteo.geocodingUrl;
    this.forecastUrl = config.openMeteo.forecastUrl;
    this.marineUrl = config.openMeteo.marineUrl;
    this.maxSearchResults = config.openMeteo.maxSearchResults;
  }

  /**
   * Fetch with timeout and retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: { retries?: number; critical?: boolean } = {}
  ): Promise<Response> {
    const { retries = MAX_RETRIES, critical = true } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok || !critical) {
          return response;
        }

        if (response.status >= 500 && attempt < retries) {
          logger.warn(
            { url, status: response.status, attempt: attempt + 1, maxRetries: retries },
            'Server error, retrying'
          );
          await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error('Unknown fetch error');

        if (error instanceof Error && error.name === 'AbortError') {
          logger.warn({ url, attempt: attempt + 1 }, 'Request timed out');
        } else {
          logger.warn(
            { url, error: lastError.message, attempt: attempt + 1 },
            'Fetch failed'
          );
        }

        if (attempt < retries) {
          await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
        }
      }
    }

    throw new ExternalServiceError(
      'External API',
      `Request failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Search for cities/towns by name.
   */
  async searchCities(query: string): Promise<City[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const sanitizedQuery = query.trim().substring(0, 100);
    const url = `${this.geocodingUrl}?name=${encodeURIComponent(sanitizedQuery)}&count=${this.maxSearchResults}&language=en&format=json`;

    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        logger.error(
          { status: response.status, query: sanitizedQuery },
          'Geocoding API request failed'
        );
        throw new ExternalServiceError('Geocoding API', `Failed with status ${response.status}`);
      }

      const rawData = await response.json();
      const parseResult = GeocodingResponseSchema.safeParse(rawData);

      if (!parseResult.success) {
        logger.error(
          { error: parseResult.error.message, query: sanitizedQuery },
          'Invalid geocoding response format'
        );
        return [];
      }

      const data = parseResult.data;

      if (!data.results || data.results.length === 0) {
        logger.debug({ query: sanitizedQuery }, 'No cities found for query');
        return [];
      }

      const cities: City[] = data.results.map((item) => ({
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        country: item.country,
        admin1: item.admin1,
        timezone: item.timezone,
      }));

      logger.debug(
        { query: sanitizedQuery, resultCount: cities.length },
        'City search completed'
      );

      return cities;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error', query: sanitizedQuery },
        'Error searching cities'
      );
      return [];
    }
  }

  /**
   * Fetch 7-day meteorological forecast.
   */
  async getWeatherForecast(
    latitude: number,
    longitude: number,
    timezone: string
  ): Promise<RawWeatherResponse> {
    const url = new URL(this.forecastUrl);
    url.searchParams.append('latitude', latitude.toString());
    url.searchParams.append('longitude', longitude.toString());
    url.searchParams.append('timezone', timezone);
    url.searchParams.append('forecast_days', FORECAST_DAYS.toString());
    url.searchParams.append(
      'daily',
      'temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,snowfall_sum,wind_speed_10m_max,weather_code,relative_humidity_2m_max'
    );

    try {
      const response = await this.fetchWithRetry(url.toString());

      if (!response.ok) {
        logger.error(
          { status: response.status, latitude, longitude },
          'Weather API request failed'
        );
        throw new ExternalServiceError('Weather API', `Failed with status ${response.status}`);
      }

      const rawData = await response.json();
      const parseResult = WeatherResponseSchema.safeParse(rawData);

      if (!parseResult.success) {
        logger.error(
          { error: parseResult.error.message, latitude, longitude },
          'Invalid weather response format'
        );
        throw new ExternalServiceError('Weather API', 'Invalid response format from weather API');
      }

      const data = parseResult.data;

      logger.debug(
        { latitude, longitude, days: data.daily.time.length },
        'Weather forecast fetched'
      );

      return data;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          latitude,
          longitude,
        },
        'Error fetching weather forecast'
      );
      throw new ExternalServiceError('Weather API', 'Failed to fetch forecast');
    }
  }

  /**
   * Fetch 7-day marine forecast (wave height, wave period).
   * Returns fallback data for inland locations instead of throwing.
   */
  async getMarineForecast(
    latitude: number,
    longitude: number,
    timezone: string
  ): Promise<RawMarineResponse> {
    const url = new URL(this.marineUrl);
    url.searchParams.append('latitude', latitude.toString());
    url.searchParams.append('longitude', longitude.toString());
    url.searchParams.append('timezone', timezone);
    url.searchParams.append('forecast_days', FORECAST_DAYS.toString());
    url.searchParams.append('daily', 'wave_height_max,wave_period_max');

    try {
      const response = await this.fetchWithRetry(url.toString(), { 
        retries: 1, 
        critical: false 
      });

      if (!response.ok) {
        logger.debug(
          { status: response.status, latitude, longitude },
          'Marine API returned error (likely inland location)'
        );
        return this.getFallbackMarineResponse();
      }

      const rawData = await response.json();
      const parseResult = MarineResponseSchema.safeParse(rawData);

      if (!parseResult.success) {
        logger.warn(
          { error: parseResult.error.message, latitude, longitude },
          'Invalid marine response format, using fallback'
        );
        return this.getFallbackMarineResponse();
      }

      const data = parseResult.data;

      if (!data.daily || !data.daily.wave_height_max) {
        logger.debug(
          { latitude, longitude },
          'Marine API returned incomplete data'
        );
        return this.getFallbackMarineResponse();
      }

      logger.debug(
        { latitude, longitude, days: data.daily.time.length },
        'Marine forecast fetched'
      );

      return data as RawMarineResponse;
    } catch (error) {
      logger.warn(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          latitude,
          longitude,
        },
        'Marine API unavailable, using fallback'
      );
      return this.getFallbackMarineResponse();
    }
  }

  private getFallbackMarineResponse(): RawMarineResponse {
    const nulls: (number | null)[] = Array(FORECAST_DAYS).fill(null);
    return {
      daily: {
        time: [],
        wave_height_max: nulls,
        wave_period_max: nulls,
      },
    };
  }
}

// Export singleton instance
export const openMeteoService = new OpenMeteoService();
