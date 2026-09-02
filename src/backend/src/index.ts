import express from 'express';
import cors from 'cors';
import { env, isDev } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

// Security & Observability Middleware
import { setupSecurityHeaders } from './middleware/securityHeaders.js';
import { setupRateLimiting } from './middleware/rateLimiting.js';
import { setupInputValidation } from './middleware/inputValidation.js';
import { securityAuditMiddleware } from './middleware/securityAudit.js';
import { setupSentryMiddleware, setupErrorHandling } from './middleware/sentryMiddleware.js';
import { tracingMiddleware } from './services/tracing.js';

// Routes
import propertyRoutes from './routes/properties.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import transactionRoutes from './routes/transactions.routes.js';
import syncRoutes from './routes/sync.js';
import emailRoutes from './routes/email.js';
import metricsRoutes from './routes/metrics.js';
import reportRoutes from './routes/reports.js';

const app = express();

// Initialize Sentry first (error tracking)
setupSentryMiddleware(app);

// Core parsing middleware
app.use(express.json());

// Security: CORS with hardening
const corsOrigin = process.env.NODE_ENV === 'production' ? (env.supabaseUrl ? [env.supabaseUrl] : '*') : '*';
app.use(
  cors({
    origin: corsOrigin as any,
    credentials: true,
    maxAge: 86400,
  })
);

// Security: HTTP Headers
setupSecurityHeaders(app);

// Security: Rate Limiting
setupRateLimiting(app);

// Security: Input Validation
setupInputValidation(app);

// Observability: Distributed Tracing
app.use(tracingMiddleware);

// Observability: Security Audit Logging
app.use(securityAuditMiddleware);

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
app.use('/api/sync', syncRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/reports', reportRoutes);

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

// Error handlers (must be last)
app.use(errorHandler);
setupErrorHandling(app);

// Start server
const port = env.port;
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📝 Environment: ${env.nodeEnv}`);
});
