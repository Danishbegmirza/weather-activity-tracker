import { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  res.status(200).json({
    message: 'Weather Activity Tracker API',
    graphql: '/graphql',
    health: '/health',
    timestamp: new Date().toISOString(),
  });
}
