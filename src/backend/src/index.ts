import express from 'express';
import cors from 'cors';
import { env, isDev } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import propertyRoutes from './routes/properties.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import transactionRoutes from './routes/transactions.routes.js';

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? [env.supabaseUrl] : '*',
  })
);

// Request logging (dev only)
if (isDev) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/properties', propertyRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/transactions', transactionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      statusCode: 404,
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const port = env.port;
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📝 Environment: ${env.nodeEnv}`);
});
