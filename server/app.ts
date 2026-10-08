import express from 'express';
import { apiRouter } from './routes';
import { initDatabase } from './db';

const app = express();

app.use(express.json());

// Initialize Neon PostgreSQL Database schema & Admin account
initDatabase().catch((err) => {
  console.warn('Initial DB check error:', err.message);
});

// Mount all API endpoints
app.use('/api', apiRouter);

export default app;
