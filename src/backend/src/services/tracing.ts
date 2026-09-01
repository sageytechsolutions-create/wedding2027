/**
 * Tracing Service with Sentry Integration
 *
 * Provides distributed tracing setup for backend using Sentry,
 * enabling collection of spans and integration with frontend tracing.
 */

import * as Sentry from '@sentry/node';

let initialized = false;

/**
 * Initialize tracing for backend
 */
export function initializeTracing(isDev: boolean = false): void {
  if (initialized) {
    console.warn('Tracing already initialized');
    return;
  }

  const tracingEnabled = process.env.SENTRY_DSN !== undefined;
  if (!tracingEnabled) {
    console.log('Sentry tracing disabled - SENTRY_DSN not set');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: isDev ? 'development' : 'production',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    attachStacktrace: true,
    maxBreadcrumbs: 50,
  });

  initialized = true;
  console.log('Sentry tracing initialized', {
    environment: isDev ? 'development' : 'production',
  });
}

/**
 * Get the tracer instance
 */
export function getTracer(name: string, version?: string) {
  return Sentry.getCurrentHub().getClient()?.getIntegration?.(Sentry.Integrations.Http);
}

/**
 * Start a named span
 */
export function startSpan(
  name: string,
  attributes?: Record<string, string | number | boolean | undefined>
) {
  return Sentry.startSpan(
    {
      name,
      op: 'custom',
      attributes,
    },
    (span) => span
  );
}

/**
 * Track an async operation
 */
export async function trackAsyncOperation<T>(
  name: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: 'custom',
      attributes,
    },
    async () => {
      try {
        return await operation();
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Track a synchronous operation
 */
export function trackSyncOperation<T>(
  name: string,
  operation: () => T,
  attributes?: Record<string, string | number | boolean | undefined>
): T {
  return Sentry.startSpan(
    {
      name,
      op: 'custom',
      attributes,
    },
    () => {
      try {
        return operation();
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Track HTTP request
 */
export async function trackHttpRequest<T>(
  method: string,
  url: string,
  request: () => Promise<T>
): Promise<T> {
  return trackAsyncOperation(
    `http.${method.toLowerCase()}`,
    request,
    {
      'http.method': method,
      'http.url': url,
    }
  );
}

/**
 * Track database operation
 */
export async function trackDatabaseOperation<T>(
  operation: string,
  dbName: string,
  query: () => Promise<T>
): Promise<T> {
  return trackAsyncOperation(
    `db.${operation}`,
    query,
    {
      'db.operation': operation,
      'db.name': dbName,
    }
  );
}

/**
 * Track authentication operation
 */
export async function trackAuthenticationOperation<T>(
  method: string,
  authenticate: () => Promise<T>
): Promise<T> {
  return trackAsyncOperation(
    `auth.${method}`,
    authenticate,
    {
      'auth.method': method,
    }
  );
}

/**
 * Track business operation
 */
export async function trackBusinessOperation<T>(
  operationType: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return trackAsyncOperation(
    `business.${operationType}`,
    operation,
    {
      'business.type': operationType,
      ...metadata,
    }
  );
}

/**
 * Track external service call
 */
export async function trackExternalServiceCall<T>(
  serviceName: string,
  endpoint: string,
  call: () => Promise<T>
): Promise<T> {
  return trackAsyncOperation(
    `external.${serviceName}`,
    call,
    {
      'service.name': serviceName,
      'service.endpoint': endpoint,
    }
  );
}

/**
 * Track cache operation
 */
export function trackCacheOperation(
  operation: 'get' | 'set' | 'delete',
  key: string,
  hit?: boolean
): void {
  Sentry.addBreadcrumb({
    category: 'cache',
    message: `Cache ${operation}: ${key}`,
    level: 'info',
    data: {
      hit: hit ?? false,
    },
  });
}

/**
 * Track message queue operation
 */
export async function trackQueueOperation<T>(
  queueName: string,
  operation: 'publish' | 'consume',
  handler: () => Promise<T>
): Promise<T> {
  return trackAsyncOperation(
    `queue.${operation}`,
    handler,
    {
      'queue.name': queueName,
      'queue.operation': operation,
    }
  );
}

/**
 * Add event to current span
 */
export function addSpanEvent(
  message: string,
  attributes?: Record<string, string | number | boolean>
): void {
  Sentry.addBreadcrumb({
    message,
    level: 'info',
    data: attributes,
  });
}

/**
 * Set attribute on current span
 */
export function setSpanAttribute(key: string, value: string | number | boolean): void {
  Sentry.setContext('span', {
    [key]: value,
  });
}

/**
 * Record exception on current span
 */
export function recordException(error: Error): void {
  Sentry.captureException(error);
}

/**
 * Express middleware for automatic request tracing
 */
export function tracingMiddleware(req: any, res: any, next: any) {
  Sentry.startSpan(
    {
      name: `http.${req.method.toLowerCase()}`,
      op: 'http.server',
      attributes: {
        'http.method': req.method,
        'http.url': req.originalUrl,
        'http.target': req.path,
        'http.host': req.hostname,
        'http.scheme': req.protocol,
        'http.client_ip': req.ip,
      },
    },
    () => {
      const originalSend = res.send;
      res.send = function (data: any) {
        res.status && Sentry.captureMessage(`${req.method} ${req.path} - ${res.statusCode}`);
        return originalSend.call(this, data);
      };
      next();
    }
  );
}

/**
 * Propagate trace context to headers
 */
export function injectTraceContext(headers: Record<string, string>): void {
  const traceId = Sentry.getCurrentHub().getClient()?.getTraceId?.();
  if (traceId) {
    headers['sentry-trace'] = traceId;
  }
}

/**
 * Extract trace context from headers
 */
export function extractTraceContext(headers: Record<string, string>): any {
  return {
    traceId: headers['sentry-trace'],
  };
}

/**
 * Shutdown tracer provider
 */
export async function shutdownTracing(): Promise<void> {
  if (initialized) {
    await Sentry.close(2000);
    initialized = false;
    console.log('Sentry tracing shut down');
  }
}

// Setup graceful shutdown
process.on('SIGTERM', async () => {
  await shutdownTracing();
});

process.on('SIGINT', async () => {
  await shutdownTracing();
});

export default {
  initializeTracing,
  getTracer,
  startSpan,
  trackAsyncOperation,
  trackSyncOperation,
  trackHttpRequest,
  trackDatabaseOperation,
  trackAuthenticationOperation,
  trackBusinessOperation,
  trackExternalServiceCall,
  trackCacheOperation,
  trackQueueOperation,
  addSpanEvent,
  setSpanAttribute,
  recordException,
  tracingMiddleware,
  injectTraceContext,
  extractTraceContext,
  shutdownTracing,
};
