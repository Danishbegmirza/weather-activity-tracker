import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import depthLimit from 'graphql-depth-limit';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { typeDefs } from '../src/schema';
import { resolvers } from '../src/resolvers';

interface ApolloContext {
  requestId: string;
}

const app = express();

// CORS - allow all origins
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

app.use(express.json({ limit: '1mb' }));

// Apollo Server setup
const server = new ApolloServer<ApolloContext>({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(7)],
  introspection: true,
});

let serverStarted = false;

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Weather Activity Tracker API',
    graphql: '/graphql',
    health: '/health',
  });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// GraphQL handler
const graphqlHandler = async (req: Request, res: Response) => {
  if (!serverStarted) {
    await server.start();
    serverStarted = true;
  }
  
  return expressMiddleware(server, {
    context: async () => ({ requestId: 'vercel-request' }),
  })(req, res, () => {});
};

app.all('/graphql', graphqlHandler);
app.all('/api/graphql', graphqlHandler);

export default app;
