export const typeDefs = `#graphql
  type City {
    name: String!
    latitude: Float!
    longitude: Float!
    country: String!
    admin1: String
    timezone: String!
  }

  type WeatherMetrics {
    tempMax: Float!
    tempMin: Float!
    precipitationSum: Float!
    rainSum: Float!
    snowfallSum: Float!
    windSpeedMax: Float!
    weatherCode: Int!
    relativeHumidityMax: Float
    waveHeightMax: Float
    wavePeriodMax: Float
  }

  type DailyScore {
    date: String!
    score: Int!
    reasoning: String!
    metrics: WeatherMetrics!
  }

  type ActivityRanking {
    id: String!
    name: String!
    overallScore: Int!
    dailyScores: [DailyScore!]!
  }

  type ActivityRankingResponse {
    city: City!
    rankings: [ActivityRanking!]!
  }

  type Query {
    searchCities(query: String!): [City!]!
    getActivityRankings(
      latitude: Float!
      longitude: Float!
      timezone: String!
      cityName: String!
      country: String!
      admin1: String
    ): ActivityRankingResponse!
  }
`;
