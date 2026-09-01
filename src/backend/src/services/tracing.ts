/**
 * OpenTelemetry Tracing Service (Phase 7 Sprint 2)
 *
 * Distributed tracing setup for backend, enabling collection of spans
 * across services and integration with frontend tracing.
 */

import { trace, context, SpanStatusCode, defaultTextMapPropagator } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry tracing for backend
 */
export function initializeTracing(isDev: boolean = false): void {
  if (sdk) {
    console.warn('Tracing already initialized');
    return;
  }

  const tracingEnabled = process.env.OTEL_ENABLED !== 'false';
  if (!tracingEnabled) {
    console.log('OpenTelemetry tracing disabled via environment variable');
    return;
  }

  const resource = Resource.default().merge(
    new Resource({
      [SEMRESATTRS_SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME || 'ai-realestate-backend',
      [SEMRESATTRS_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
      environment: isDev ? 'development' : 'production',
    })
  );

  // Configure OTLP exporter
  const collectorUrl = process.env.OTEL_COLLECTOR_URL || 'http://localhost:4317';
  const exporter = new OTLPTraceExporter({
    url: `${collectorUrl}/v1/traces`,
  });

  // Create SDK
  sdk = new NodeSDK({
    resource,
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  // Start SDK
  sdk.start();

  console.log('OpenTelemetry tracing initialized', {
    serviceName: process.env.OTEL_SERVICE_NAME,
    collectorUrl,
  });
}

/**
 * Get the tracer instance
 */
export function getTracer(name: string, version?: string) {
  return trace.getTracer(name, version);
}

/**
 * Start a named span
 */
export function startSpan(
  name: string,
  attributes?: Record<string, string | number | boolean | undefined>
) {
  const tracer = getTracer('ai-realestate-backend');
  const span = tracer.startSpan(name);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) {
        span.setAttribute(key, value);
      }
    });
  }

  return span;
}

/**
 * Track an async operation
 */
export async function trackAsyncOperation<T>(
  name: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const span = startSpan(name, attributes);

  try {
    const result = await operation();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Track a synchronous operation
 */
export function trackSyncOperation<T>(
  name: string,
  operation: () => T,
  attributes?: Record<string, string | number | boolean | undefined>
): T {
  const span = startSpan(name, attributes);

  try {
    const result = operation();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
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
      'span.kind': 'client',
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
      'span.kind': 'client',
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
      'span.kind': 'internal',
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
      'span.kind': 'internal',
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
      'span.kind': 'client',
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
  const span = startSpan(`cache.${operation}`, {
    'cache.key': key,
    'cache.hit': hit ?? false,
  });
  span.end();
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
      'span.kind': 'client',
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
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(message, attributes);
  }
}

/**
 * Set attribute on current span
 */
export function setSpanAttribute(key: string, value: string | number | boolean): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(key, value);
  }
}

/**
 * Record exception on current span
 */
export function recordException(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
  }
}

/**
 * Express middleware for automatic request tracing
 */
export function tracingMiddleware(req: any, res: any, next: any) {
  const span = startSpan(`http.${req.method.toLowerCase()}`, {
    'http.method': req.method,
    'http.url': req.originalUrl,
    'http.target': req.path,
    'http.host': req.hostname,
    'http.scheme': req.protocol,
    'http.client_ip': req.ip,
  });

  // Update span with response details
  const originalSend = res.send;
  res.send = function (data: any) {
    span.setStatus({
      code: res.statusCode < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
    });
    span.setAttribute('http.status_code', res.statusCode);
    span.end();
    return originalSend.call(this, data);
  };

  // Run operation in span context
  context.with(trace.setSpan(context.active(), span), () => {
    next();
  });
}

/**
 * Propagate trace context to headers
 * Use this when making external requests
 */
export function injectTraceContext(headers: Record<string, string>): void {
  const span = trace.getActiveSpan();
  if (span) {
    defaultTextMapPropagator.inject(context.active(), headers, {
      set: (carrier: any, key: string, value: string) => {
        carrier[key] = value;
      },
    });
  }
}

/**
 * Extract trace context from headers
 * Use this when receiving requests from other services
 */
export function extractTraceContext(headers: Record<string, string>): any {
  return defaultTextMapPropagator.extract(context.active(), headers, {
    get: (carrier: any, key: string) => {
      return carrier[key];
    },
    keys: (carrier: any) => Object.keys(carrier),
  });
}

/**
 * Shutdown tracer provider
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    console.log('OpenTelemetry tracing shut down');
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
