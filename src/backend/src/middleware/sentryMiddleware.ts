/**
 * Sentry Express Middleware (Phase 7 Sprint 2)
 *
 * Express middleware for Sentry integration, capturing requests,
 * responses, errors, and performance metrics.
 */

import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { captureException, addBreadcrumb, trackQueryPerformance, setRequestContext, clearRequestContext } from '../services/errorTracking';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
    }
  }
}

/**
 * Middleware to initialize request tracking
 * Adds unique request ID and timing information
 */
export function initializeRequestTracking(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Add request ID if not present
  if (!req.id) {
    req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Record start time
  (req as any).startTime = Date.now();

  // Extract user information
  const userId = (req as any).user?.id;
  const email = (req as any).user?.email;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Set Sentry context
  setRequestContext({
    requestId: req.id,
    ip,
    userAgent,
    userId,
    email,
  });

  // Capture response finish
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - (req as any).startTime;
    const status = res.statusCode;

    // Track performance
    trackQueryPerformance(req.path, req.method, status, duration);

    // Add breadcrumb for successful responses
    if (status < 400) {
      addBreadcrumb(
        `${req.method} ${req.path}`,
        'http_request',
        'info',
        {
          method: req.method,
          path: req.path,
          status,
          duration,
          requestId: req.id,
        }
      );
    }

    // Clean up context
    clearRequestContext();

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware for tracking request parameters
 * Logs important request details for debugging
 */
export function trackRequestDetails(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Don't log sensitive endpoints
  const sensitivePatterns = [/auth\/login/, /auth\/password/, /secrets/, /keys/];
  const isSensitive = sensitivePatterns.some((p) => p.test(req.path));

  if (!isSensitive) {
    // Log query parameters (excluding sensitive ones)
    const sensitiveParams = ['password', 'token', 'secret', 'apiKey', 'api_key'];
    const safeQuery = Object.entries(req.query).reduce(
      (acc, [key, value]) => {
        if (sensitiveParams.includes(key)) {
          acc[key] = '***REDACTED***';
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>
    );

    if (Object.keys(safeQuery).length > 0) {
      addBreadcrumb(
        `Query parameters: ${JSON.stringify(safeQuery)}`,
        'request_params',
        'info'
      );
    }

    // Log body size (not content for privacy)
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      addBreadcrumb(
        `Request body size: ${contentLength} bytes`,
        'request_body',
        'info'
      );
    }
  }

  next();
}

/**
 * Middleware for tracking database operations
 * Should be called within route handlers
 */
export function trackDatabaseOperation(
  operationName: string,
  duration: number,
  success: boolean,
  query?: string
): void {
  const level = success ? 'info' : 'warning';
  addBreadcrumb(
    `Database: ${operationName}`,
    'database',
    level,
    {
      operation: operationName,
      duration,
      success,
      query: query?.substring(0, 100),
    }
  );
}

/**
 * Error handling middleware
 * Captures and logs errors with full context
 */
export function errorHandlingMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Capture error
  const eventId = captureException(err, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
  });

  // Add status code if available
  const statusCode = (err as any).statusCode || 500;
  const message = (err as any).message || 'Internal Server Error';

  // Log error breadcrumb
  addBreadcrumb(
    `Error: ${message}`,
    'error',
    'error',
    {
      statusCode,
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }
  );

  // Return error response
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      eventId, // For user support
      requestId: req.id,
    },
  });
}

/**
 * Middleware for tracking slow requests
 */
export function slowRequestWarning(thresholdMs: number = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (data: any) {
      const duration = Date.now() - (req as any).startTime;

      if (duration > thresholdMs) {
        addBreadcrumb(
          `Slow request: ${req.method} ${req.path} (${duration}ms)`,
          'performance',
          'warning',
          {
            method: req.method,
            path: req.path,
            duration,
            threshold: thresholdMs,
          }
        );
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Middleware for tracking third-party API calls
 * Use this to track external service integrations
 */
export function trackExternalServiceCall(
  serviceName: string,
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  error?: string
): void {
  const success = statusCode >= 200 && statusCode < 400;
  const level = success ? 'info' : 'warning';

  addBreadcrumb(
    `External: ${method} ${serviceName}${endpoint}`,
    'external_service',
    level,
    {
      service: serviceName,
      endpoint,
      method,
      statusCode,
      duration,
      error,
    }
  );
}

/**
 * Middleware for tracking authentication
 */
export function trackAuthenticationAttempt(
  success: boolean,
  method: string,
  userId?: string,
  error?: string
): void {
  addBreadcrumb(
    `Authentication: ${success ? 'success' : 'failed'} (${method})`,
    'authentication',
    success ? 'info' : 'warning',
    {
      success,
      method,
      userId,
      error,
    }
  );
}

/**
 * Middleware for tracking authorization failures
 */
export function trackAuthorizationFailure(
  userId: string,
  resource: string,
  action: string
): void {
  addBreadcrumb(
    `Authorization failed: ${action} on ${resource}`,
    'authorization',
    'warning',
    {
      userId,
      resource,
      action,
    }
  );
}

/**
 * Middleware for tracking data validation failures
 */
export function trackValidationError(
  field: string,
  error: string,
  value?: string
): void {
  addBreadcrumb(
    `Validation error: ${field}`,
    'validation',
    'warning',
    {
      field,
      error,
      value: value ? '***REDACTED***' : undefined,
    }
  );
}

/**
 * Middleware for tracking payment/transaction operations
 */
export function trackTransactionOperation(
  transactionId: string,
  type: 'charge' | 'refund' | 'subscription',
  amount: number,
  currency: string,
  success: boolean,
  error?: string
): void {
  const level = success ? 'info' : 'error';

  addBreadcrumb(
    `Transaction: ${type} ${amount}${currency}`,
    'transaction',
    level,
    {
      transactionId,
      type,
      amount,
      currency,
      success,
      error,
    }
  );
}

/**
 * Middleware for tracking cache operations
 */
export function trackCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  duration?: number
): void {
  const level = operation === 'miss' ? 'info' : 'info';

  addBreadcrumb(
    `Cache ${operation}: ${key}`,
    'cache',
    level,
    {
      operation,
      key,
      duration,
    }
  );
}

/**
 * Middleware for rate limiting tracking
 */
export function trackRateLimitExceeded(
  userId: string,
  endpoint: string,
  limit: number,
  window: string
): void {
  addBreadcrumb(
    `Rate limit exceeded: ${endpoint}`,
    'rate_limit',
    'warning',
    {
      userId,
      endpoint,
      limit,
      window,
    }
  );
}

/**
 * Middleware for tracking feature flags
 */
export function trackFeatureFlagCheck(
  flagName: string,
  enabled: boolean,
  userId?: string
): void {
  addBreadcrumb(
    `Feature flag: ${flagName} (${enabled ? 'enabled' : 'disabled'})`,
    'feature_flag',
    'info',
    {
      flag: flagName,
      enabled,
      userId,
    }
  );
}

/**
 * Setup all Sentry middleware for Express
 */
export function setupSentryMiddleware(app: any): void {
  // Sentry request handler must be first
  app.use(Sentry.Handlers.requestHandler());

  // Custom middleware
  app.use(initializeRequestTracking);
  app.use(trackRequestDetails);
  app.use(slowRequestWarning(1000)); // Warn on requests > 1s

  // Error handling must be after routes
  // Add separately: app.use(errorHandlingMiddleware);
  // Add separately: app.use(Sentry.Handlers.errorHandler());
}

/**
 * Setup error handling middleware (call after all routes)
 */
export function setupErrorHandling(app: any): void {
  app.use(errorHandlingMiddleware);
  app.use(Sentry.Handlers.errorHandler());
}

export default {
  initializeRequestTracking,
  trackRequestDetails,
  trackDatabaseOperation,
  errorHandlingMiddleware,
  slowRequestWarning,
  trackExternalServiceCall,
  trackAuthenticationAttempt,
  trackAuthorizationFailure,
  trackValidationError,
  trackTransactionOperation,
  trackCacheOperation,
  trackRateLimitExceeded,
  trackFeatureFlagCheck,
  setupSentryMiddleware,
  setupErrorHandling,
};
