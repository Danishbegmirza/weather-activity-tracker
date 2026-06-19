import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import depthLimit from 'graphql-depth-limit';
import express from 'express';
import http from 'http';
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

async function startServer(): Promise<http.Server> {
  // Validate configuration on startup
  validateConfig();
  logger.info({ config: { ...config, cors: { ...config.cors } } }, 'Configuration loaded');

  const app = express();
  const httpServer = http.createServer(app);

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

  // CORS configuration
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }
      if (config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
        return callback(null, true);
      }
      logger.warn({ origin }, 'CORS request blocked');
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400, // 24 hours
  };

  // GraphQL security: depth limiting to prevent deeply nested query attacks
  const MAX_QUERY_DEPTH = 7;

  // Apollo Server setup
  const server = new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers,
    validationRules: [depthLimit(MAX_QUERY_DEPTH)],
    introspection: config.nodeEnv !== 'production',
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async requestDidStart({ request, contextValue }) {
          const startTime = Date.now();
          logger.debug(
            {
              requestId: contextValue.requestId,
              operationName: request.operationName,
            },
            'GraphQL request started'
          );

          return {
            async willSendResponse({ response }) {
              const duration = Date.now() - startTime;
              logger.info(
                {
                  requestId: contextValue.requestId,
                  operationName: request.operationName,
                  duration: `${duration}ms`,
                  errors: response.body.kind === 'single' ? response.body.singleResult.errors?.length : 0,
                },
                'GraphQL request completed'
              );
            },
            async didEncounterErrors({ errors, contextValue: ctx }) {
              for (const error of errors) {
                logger.error(
                  {
                    requestId: ctx.requestId,
                    message: error.message,
                    path: error.path,
                    extensions: error.extensions,
                  },
                  'GraphQL error'
                );
              }
            },
          };
        },
      },
    ],
    formatError: (formattedError, error) => {
      // Don't expose internal errors in production
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

  await server.start();
  logger.info('Apollo Server started');

  // GraphQL endpoint
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(corsOptions),
    express.json({ limit: '1mb' }),
    expressMiddleware(server, {
      context: async ({ req }): Promise<ApolloContext> => ({
        requestId: req.requestId || 'unknown',
      }),
    })
  );

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Readiness check (includes dependency checks)
  app.get('/ready', async (_req, res) => {
    try {
      // Could add database/cache checks here
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Error handler (must be last)
  app.use(errorHandler);

  // Start listening
  await new Promise<void>((resolve) =>
    httpServer.listen({ port: config.port }, resolve)
  );

  logger.info(
    {
      port: config.port,
      environment: config.nodeEnv,
      graphqlPath: '/graphql',
    },
    `Server ready at http://localhost:${config.port}/graphql`
  );

  return httpServer;
}

// Graceful shutdown handling
function setupGracefulShutdown(httpServer: http.Server): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.on(signal, () => {
      logger.info({ signal }, 'Received shutdown signal');

      httpServer.close((err) => {
        if (err) {
          logger.error({ error: err.message }, 'Error during server shutdown');
          process.exit(1);
        }

        logger.info('Server closed gracefully');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    });
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

// Start the server
startServer()
  .then((httpServer) => {
    setupGracefulShutdown(httpServer);
  })
  .catch((err) => {
    logger.fatal({ error: err.message, stack: err.stack }, 'Failed to start server');
    process.exit(1);
  });
