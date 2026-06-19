import { gql } from '@apollo/client';

export const SEARCH_CITIES = gql`
  query SearchCities($query: String!) {
    searchCities(query: $query) {
      name
      latitude
      longitude
      country
      admin1
      timezone
    }
  }
`;

export const GET_ACTIVITY_RANKINGS = gql`
  query GetActivityRankings(
    $latitude: Float!
    $longitude: Float!
    $timezone: String!
    $cityName: String!
    $country: String!
    $admin1: String
  ) {
    getActivityRankings(
      latitude: $latitude
      longitude: $longitude
      timezone: $timezone
      cityName: $cityName
      country: $country
      admin1: $admin1
    ) {
      city {
        name
        latitude
        longitude
        country
        admin1
        timezone
      }
      rankings {
        id
        name
        overallScore
        dailyScores {
          date
          score
          reasoning
          metrics {
            tempMax
            tempMin
            precipitationSum
            rainSum
            snowfallSum
            windSpeedMax
            weatherCode
            relativeHumidityMax
            waveHeightMax
            wavePeriodMax
          }
        }
      }
    }
  }
`;
