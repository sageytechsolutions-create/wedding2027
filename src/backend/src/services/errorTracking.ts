/**
 * Error Tracking Service (Phase 7 Sprint 2)
 *
 * Sentry integration for backend error tracking, performance monitoring,
 * and distributed tracing context. Captures errors, transactions, and
 * business events for production observability.
 */

import * as Sentry from '@sentry/node';

export interface RequestContext {
  userId?: string;
  email?: string;
  requestId: string;
  ip: string;
  userAgent: string;
}

export interface BusinessContext {
  eventType: string;
  amount?: number;
  currency?: string;
  propertyId?: string;
  status: 'success' | 'failed' | 'pending';
}

/**
 * Initialize Sentry error tracking for backend
 * Called once during app startup
 */
export function initializeErrorTracking(isDev: boolean = false): void {
  const environment = isDev ? 'development' : 'production';
  const dsn = process.env.SENTRY_DSN || '';

  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Release tracking
    release: process.env.APP_VERSION || '1.0.0',

    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],

    // Performance
    maxBreadcrumbs: 50,
    attachStacktrace: true,
    sendDefaultPii: false,

    // Filtering
    denyUrls: [
      // Internal services
      /localhost/i,
      /127\.0\.0\.1/i,
    ],

    ignoreErrors: [
      // Network timeouts (expected)
      'ETIMEDOUT',
      'ECONNREFUSED',
      // Request aborted
      'Request aborted',
      // DNS failures (expected in some scenarios)
      'ENOTFOUND',
    ],
  });

  console.log('Sentry error tracking initialized', {
    environment,
  });
}

/**
 * Set request context for error tracking
 * Called at the beginning of each request
 */
export function setRequestContext(context: RequestContext): void {
  Sentry.setContext('request', {
    requestId: context.requestId,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  if (context.userId || context.email) {
    Sentry.setUser({
      id: context.userId,
      email: context.email,
      ip_address: context.ip,
    });
  }
}

/**
 * Clear request context
 */
export function clearRequestContext(): void {
  Sentry.setUser(null);
  Sentry.clearBreadcrumbs();
}

/**
 * Capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>): string {
  if (context) {
    Sentry.setContext('error_context', context);
  }
  return Sentry.captureException(error);
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'info'
): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for action tracking
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a transaction for performance tracking
 */
export function startTransaction(
  name: string,
  op: string,
  attributes?: Record<string, string | number>
) {
  const transaction = Sentry.startTransaction({
    name,
    op,
  });

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      transaction?.setTag(key, value);
    });
  }

  return transaction;
}

/**
 * Set a tag for filtering in Sentry
 */
export function setTag(key: string, value: string | number | boolean): void {
  Sentry.setTag(key, value);
}

/**
 * Set multiple tags at once
 */
export function setTags(tags: Record<string, string | number | boolean>): void {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
}

/**
 * Track a database query
 */
export function trackDatabaseQuery(
  query: string,
  duration: number,
  success: boolean
): void {
  addBreadcrumb(
    `Database query: ${query.substring(0, 50)}...`,
    'database',
    success ? 'info' : 'warning',
    {
      query: query.substring(0, 200),
      duration,
      success,
    }
  );
}

/**
 * Track an API call to external service
 */
export function trackExternalApiCall(
  service: string,
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
): void {
  const success = statusCode >= 200 && statusCode < 400;
  addBreadcrumb(
    `External API: ${method} ${service}${endpoint}`,
    'external_api',
    success ? 'info' : 'warning',
    {
      service,
      endpoint,
      method,
      statusCode,
      duration,
    }
  );
}

/**
 * Track cache operation
 */
export function trackCache(
  operation: 'get' | 'set' | 'delete',
  key: string,
  hit: boolean,
  duration?: number
): void {
  addBreadcrumb(
    `Cache ${operation}: ${key}`,
    'cache',
    hit ? 'info' : 'warning',
    {
      operation,
      key,
      hit,
      duration,
    }
  );
}

/**
 * Track authentication event
 */
export function logAuthEvent(
  success: boolean,
  method: 'email' | 'oauth' | 'token',
  userId?: string,
  duration?: number
): void {
  const status = success ? 'success' : 'failure';
  addBreadcrumb(
    `Auth ${status}: ${method}`,
    'auth',
    success ? 'info' : 'warning',
    {
      method,
      status,
      userId,
      duration,
    }
  );
}

/**
 * Track business events (transactions, property operations, etc.)
 */
export function logBusinessEvent(context: BusinessContext): void {
  const level = context.status === 'success' ? 'info' : 'warning';
  addBreadcrumb(
    `Business event: ${context.eventType}`,
    context.eventType,
    level,
    {
      eventType: context.eventType,
      status: context.status,
      amount: context.amount,
      currency: context.currency,
      propertyId: context.propertyId,
    }
  );
}

/**
 * Track search operation
 */
export function trackSearch(
  query: string,
  resultCount: number,
  duration: number
): void {
  addBreadcrumb(
    `Search: "${query}" (${resultCount} results)`,
    'search',
    'info',
    {
      query,
      resultCount,
      duration,
    }
  );
}

/**
 * Track file upload/processing
 */
export function trackFileOperation(
  operation: 'upload' | 'download' | 'process',
  filename: string,
  size: number,
  duration: number,
  success: boolean
): void {
  addBreadcrumb(
    `File ${operation}: ${filename}`,
    'file',
    success ? 'info' : 'warning',
    {
      operation,
      filename,
      size,
      duration,
      success,
    }
  );
}

/**
 * Track email sending
 */
export function trackEmailSent(
  to: string,
  subject: string,
  success: boolean,
  error?: string
): void {
  addBreadcrumb(
    `Email: ${subject}`,
    'email',
    success ? 'info' : 'error',
    {
      to: to.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Redact email
      subject,
      success,
      error,
    }
  );
}

/**
 * Track rate limiting events
 */
export function trackRateLimit(
  endpoint: string,
  userId: string,
  remaining: number
): void {
  if (remaining <= 10) {
    addBreadcrumb(
      `Rate limit approaching: ${endpoint}`,
      'rate_limit',
      'warning',
      {
        endpoint,
        remaining,
      }
    );
  }
}

/**
 * Wrap async function with error tracking
 */
export async function withErrorTracking<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | null> {
  const transaction = startTransaction(context, 'function.execute');
  try {
    const result = await fn();
    transaction?.finish();
    return result;
  } catch (error) {
    captureException(error as Error, { context });
    transaction?.finish();
    throw error;
  }
}

/**
 * Middleware for Express to capture requests/responses
 */
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

/**
 * Middleware for Express to capture errors
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

/**
 * Middleware for Express to add request context
 */
export function contextMiddleware(
  req: any,
  res: any,
  next: any
) {
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  setRequestContext({
    requestId,
    ip,
    userAgent,
    userId: req.user?.id,
    email: req.user?.email,
  });

  res.on('finish', () => {
    clearRequestContext();
  });

  next();
}

/**
 * Track query performance
 */
export function trackQueryPerformance(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
): void {
  const isError = statusCode >= 400;
  const level = isError ? 'warning' : 'info';

  addBreadcrumb(
    `${method} ${endpoint} - ${statusCode}`,
    'http_request',
    level,
    {
      endpoint,
      method,
      statusCode,
      duration,
    }
  );

  // Alert if slow
  if (duration > 1000) {
    captureMessage(
      `Slow endpoint: ${method} ${endpoint} took ${duration}ms`,
      'warning'
    );
  }
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandler(): void {
  process.on('uncaughtException', (error) => {
    captureException(error, { type: 'uncaughtException' });
    console.error('Uncaught exception:', error);
  });

  process.on('unhandledRejection', (reason) => {
    captureException(
      reason instanceof Error ? reason : new Error(String(reason)),
      { type: 'unhandledRejection' }
    );
    console.error('Unhandled rejection:', reason);
  });
}

/**
 * Flush and close Sentry
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}

export default {
  initializeErrorTracking,
  setRequestContext,
  clearRequestContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  startTransaction,
  setTag,
  setTags,
  trackDatabaseQuery,
  trackExternalApiCall,
  trackCache,
  logAuthEvent,
  logBusinessEvent,
  trackSearch,
  trackFileOperation,
  trackEmailSent,
  trackRateLimit,
  trackQueryPerformance,
  withErrorTracking,
  sentryRequestHandler,
  sentryErrorHandler,
  contextMiddleware,
  setupGlobalErrorHandler,
  flushSentry,
};
