import { ApolloClient, InMemoryCache } from '@apollo/client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const client = new ApolloClient({
  uri: `${API_BASE_URL}/graphql`,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});

export default client;
