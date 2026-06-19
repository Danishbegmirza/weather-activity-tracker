import dotenv from 'dotenv';

dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  logLevel: string;

  cors: {
    origins: string[];
    credentials: boolean;
  };

  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };

  cache: {
    defaultTtlSeconds: number;
    maxEntries: number;
  };

  openMeteo: {
    geocodingUrl: string;
    forecastUrl: string;
    marineUrl: string;
    maxSearchResults: number;
    forecastDays: number;
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
  };
}

function parseOrigins(originsEnv: string | undefined): string[] {
  if (!originsEnv) {
    return ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
  }
  return originsEnv.split(',').map((origin) => origin.trim());
}

function requireEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: requireEnvNumber('PORT', 4000),
  logLevel: process.env.LOG_LEVEL || 'info',

  cors: {
    origins: parseOrigins(process.env.CORS_ORIGINS),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  rateLimit: {
    windowMs: requireEnvNumber('RATE_LIMIT_WINDOW_MS', 60 * 1000), // 1 minute
    maxRequests: requireEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  cache: {
    defaultTtlSeconds: requireEnvNumber('CACHE_TTL_SECONDS', 1800), // 30 minutes
    maxEntries: requireEnvNumber('CACHE_MAX_ENTRIES', 1000),
  },

  openMeteo: {
    geocodingUrl:
      process.env.OPEN_METEO_GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1/search',
    forecastUrl: process.env.OPEN_METEO_FORECAST_URL || 'https://api.open-meteo.com/v1/forecast',
    marineUrl: process.env.OPEN_METEO_MARINE_URL || 'https://marine-api.open-meteo.com/v1/marine',
    maxSearchResults: requireEnvNumber('OPEN_METEO_MAX_SEARCH_RESULTS', 10),
    forecastDays: requireEnvNumber('OPEN_METEO_FORECAST_DAYS', 7),
    timeoutMs: requireEnvNumber('OPEN_METEO_TIMEOUT_MS', 10000), // 10 seconds
    maxRetries: requireEnvNumber('OPEN_METEO_MAX_RETRIES', 2),
    retryDelayMs: requireEnvNumber('OPEN_METEO_RETRY_DELAY_MS', 1000),
  },
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (config.rateLimit.maxRequests < 1) {
    errors.push('RATE_LIMIT_MAX_REQUESTS must be at least 1');
  }

  if (config.cache.defaultTtlSeconds < 0) {
    errors.push('CACHE_TTL_SECONDS must be non-negative');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
