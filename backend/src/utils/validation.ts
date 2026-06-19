import { ValidationError } from '../middleware/errorHandler';

export interface CitySearchInput {
  query: string;
}

export interface ActivityRankingsInput {
  latitude: number;
  longitude: number;
  timezone: string;
  cityName: string;
  country: string;
  admin1?: string;
}

export function validateCitySearch(input: CitySearchInput): void {
  const { query } = input;

  if (!query || typeof query !== 'string') {
    throw new ValidationError('Query is required and must be a string');
  }

  if (query.trim().length < 2) {
    throw new ValidationError('Query must be at least 2 characters');
  }

  if (query.length > 100) {
    throw new ValidationError('Query must not exceed 100 characters');
  }

  // Basic sanitization check - prevent obvious injection attempts
  const dangerousPatterns = /<script|javascript:|data:/i;
  if (dangerousPatterns.test(query)) {
    throw new ValidationError('Invalid characters in query');
  }
}

export function validateActivityRankings(input: ActivityRankingsInput): void {
  const { latitude, longitude, timezone, cityName, country } = input;

  // Validate latitude
  if (typeof latitude !== 'number' || isNaN(latitude)) {
    throw new ValidationError('Latitude must be a valid number');
  }
  if (latitude < -90 || latitude > 90) {
    throw new ValidationError('Latitude must be between -90 and 90');
  }

  // Validate longitude
  if (typeof longitude !== 'number' || isNaN(longitude)) {
    throw new ValidationError('Longitude must be a valid number');
  }
  if (longitude < -180 || longitude > 180) {
    throw new ValidationError('Longitude must be between -180 and 180');
  }

  // Validate timezone
  if (!timezone || typeof timezone !== 'string') {
    throw new ValidationError('Timezone is required');
  }
  if (timezone.length > 50) {
    throw new ValidationError('Invalid timezone format');
  }
  // Basic timezone format validation
  const timezonePattern = /^[A-Za-z_]+\/[A-Za-z_]+|UTC$/;
  if (!timezonePattern.test(timezone)) {
    throw new ValidationError('Invalid timezone format. Expected format: Region/City or UTC');
  }

  // Validate city name
  if (!cityName || typeof cityName !== 'string') {
    throw new ValidationError('City name is required');
  }
  if (cityName.trim().length < 1 || cityName.length > 100) {
    throw new ValidationError('City name must be between 1 and 100 characters');
  }

  // Validate country
  if (!country || typeof country !== 'string') {
    throw new ValidationError('Country is required');
  }
  if (country.trim().length < 1 || country.length > 100) {
    throw new ValidationError('Country must be between 1 and 100 characters');
  }
}

export function sanitizeString(input: string, maxLength = 100): string {
  return input.trim().substring(0, maxLength);
}
