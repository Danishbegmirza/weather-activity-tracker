import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import depthLimit from 'graphql-depth-limit';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import {
  rateLimiter,
  requestIdMiddleware,
  requestLoggerMiddleware,
  errorHandler,
} from './middleware';

interface ApolloContext {
  requestId: string;
}

// Validate configuration on startup
validateConfig();

const app = express();

// Trust proxy for accurate IP detection behind reverse proxies
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// Compression
app.use(compression());

// Request tracking
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Rate limiting
app.use(rateLimiter);

// CORS configuration - allow all origins for Vercel deployment
const corsOptions: cors.CorsOptions = {
  origin: true, // Allow all origins
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400,
};

// GraphQL security: depth limiting
const MAX_QUERY_DEPTH = 7;

// Apollo Server setup
const server = new ApolloServer<ApolloContext>({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(MAX_QUERY_DEPTH)],
  introspection: true, // Enable introspection for the deployed API
  formatError: (formattedError, error) => {
    if (config.nodeEnv === 'production' && !formattedError.extensions?.code) {
      logger.error({ error }, 'Unhandled GraphQL error');
      return {
        message: 'Internal server error',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };
    }
    return formattedError;
  },
});

// Start server promise
let serverStarted = false;
const startServer = async () => {
  if (!serverStarted) {
    await server.start();
    serverStarted = true;
    logger.info('Apollo Server started');
  }
};

// Apply CORS to all routes
app.use(cors<cors.CorsRequest>(corsOptions));

// GraphQL endpoint
app.use(
  '/graphql',
  express.json({ limit: '1mb' }),
  async (req, res, next) => {
    await startServer();
    return expressMiddleware(server, {
      context: async ({ req }): Promise<ApolloContext> => ({
        requestId: req.requestId || 'unknown',
      }),
    })(req, res, next);
  }
);

// Also handle /api/graphql for Vercel routing
app.use(
  '/api/graphql',
  express.json({ limit: '1mb' }),
  async (req, res, next) => {
    await startServer();
    return expressMiddleware(server, {
      context: async ({ req }): Promise<ApolloContext> => ({
        requestId: req.requestId || 'unknown',
      }),
    })(req, res, next);
  }
);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Weather Activity Tracker API',
    graphql: '/graphql',
    health: '/health',
  });
});

// Error handler
app.use(errorHandler);

export { app, startServer };
export default app;
