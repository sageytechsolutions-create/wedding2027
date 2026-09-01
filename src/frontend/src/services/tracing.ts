/**
 * OpenTelemetry Tracing Service (Phase 7 Sprint 2)
 *
 * Distributed tracing setup for frontend, enabling collection of spans
 * across the application for performance analysis and debugging.
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/auto-instrumentations-web';

let tracerProvider: WebTracerProvider | null = null;

/**
 * Initialize OpenTelemetry tracing for frontend
 */
export function initializeTracing(isDev: boolean = false): void {
  if (tracerProvider) {
    console.warn('Tracing already initialized');
    return;
  }

  const tracingEnabled = import.meta.env.VITE_OTEL_ENABLED !== 'false';
  if (!tracingEnabled) {
    console.log('OpenTelemetry tracing disabled via environment variable');
    return;
  }

  const resource = Resource.default().merge(
    new Resource({
      [SEMRESATTRS_SERVICE_NAME]: import.meta.env.VITE_OTEL_SERVICE_NAME || 'ai-realestate-frontend',
      [SEMRESATTRS_SERVICE_VERSION]: import.meta.env.VITE_OTEL_SERVICE_VERSION || '1.0.0',
      environment: isDev ? 'development' : 'production',
    })
  );

  tracerProvider = new WebTracerProvider({ resource });

  // Configure OTLP exporter
  const collectorUrl = import.meta.env.VITE_OTEL_COLLECTOR_URL || 'http://localhost:4317';
  const exporter = new OTLPTraceExporter({
    url: `${collectorUrl}/v1/traces`,
  });

  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  // Register auto-instrumentations (fetch, XMLHttpRequest, React Router, etc.)
  registerInstrumentations({
    tracerProvider,
    instrumentations: [
      {
        name: '@opentelemetry/instrumentation-fetch',
        config: {
          requestHook: (span, request) => {
            span.setAttribute('http.url', request.url);
          },
          responseHook: (span, response) => {
            span.setAttribute('http.status_code', response.status);
          },
        },
      },
      {
        name: '@opentelemetry/instrumentation-xml-http-request',
        config: {
          requestHook: (span, request) => {
            span.setAttribute('http.method', request.method);
            span.setAttribute('http.url', request.url);
          },
          responseHook: (span, xhr) => {
            span.setAttribute('http.status_code', xhr.status);
          },
        },
      },
    ],
  });

  console.log('OpenTelemetry tracing initialized', {
    serviceName: import.meta.env.VITE_OTEL_SERVICE_NAME,
    collectorUrl,
  });
}

/**
 * Get the tracer instance
 */
export function getTracer(name: string, version?: string) {
  if (!tracerProvider) {
    console.warn('Tracing not initialized. Call initializeTracing() first.');
    return null;
  }
  return tracerProvider.getTracer(name, version);
}

/**
 * Start a named span
 */
export function startSpan(
  name: string,
  attributes?: Record<string, string | number | boolean | undefined>
) {
  const tracer = getTracer('ai-realestate-frontend');
  if (!tracer) return null;

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
    span?.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span?.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span?.recordException(error as Error);
    throw error;
  } finally {
    span?.end();
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
    span?.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span?.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span?.recordException(error as Error);
    throw error;
  } finally {
    span?.end();
  }
}

/**
 * Track API request
 */
export async function trackApiRequest<T>(
  method: string,
  endpoint: string,
  request: () => Promise<T>
): Promise<T> {
  return trackAsyncOperation(
    `api.${method.toLowerCase()}.${endpoint.replace(/\//g, '_')}`,
    request,
    {
      'http.method': method,
      'http.url': endpoint,
      'span.kind': 'client',
    }
  );
}

/**
 * Track user interaction
 */
export function trackUserInteraction(
  action: string,
  details?: Record<string, string | number | boolean>
) {
  const span = startSpan(`user.${action}`, {
    'span.kind': 'internal',
    ...details,
  });
  span?.end();
}

/**
 * Track page navigation
 */
export function trackNavigation(from: string, to: string) {
  const span = startSpan('navigation', {
    'from': from,
    'to': to,
    'span.kind': 'internal',
  });
  span?.end();
}

/**
 * Track component render
 */
export function trackComponentRender(componentName: string, renderTime: number) {
  const span = startSpan(`react.render.${componentName}`, {
    'render.time_ms': renderTime,
    'span.kind': 'internal',
  });
  span?.end();
}

/**
 * Track data fetch operation
 */
export async function trackDataFetch<T>(
  dataType: string,
  fetch: () => Promise<T>
): Promise<T> {
  return trackAsyncOperation(
    `data.fetch.${dataType}`,
    fetch,
    { 'span.kind': 'client' }
  );
}

/**
 * Track search operation
 */
export async function trackSearch<T>(
  query: string,
  search: () => Promise<T>
): Promise<T> {
  return trackAsyncOperation(
    'search.execute',
    search,
    {
      'search.query': query,
      'span.kind': 'internal',
    }
  );
}

/**
 * Track form submission
 */
export async function trackFormSubmission<T>(
  formName: string,
  submit: () => Promise<T>
): Promise<T> {
  return trackAsyncOperation(
    `form.submit.${formName}`,
    submit,
    { 'span.kind': 'internal' }
  );
}

/**
 * Add event to current span
 */
export function addSpanEvent(
  message: string,
  attributes?: Record<string, string | number | boolean>
) {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(message, attributes);
  }
}

/**
 * Set attribute on current span
 */
export function setSpanAttribute(
  key: string,
  value: string | number | boolean
) {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(key, value);
  }
}

/**
 * React hook for tracking component lifecycle
 */
export function useTracing(componentName: string) {
  const startTime = performance.now();

  return {
    trackEvent: (eventName: string, attributes?: Record<string, string | number | boolean>) => {
      trackUserInteraction(`${componentName}.${eventName}`, attributes);
    },
    trackAsync: async <T,>(
      operationName: string,
      operation: () => Promise<T>
    ): Promise<T> => {
      return trackAsyncOperation(
        `${componentName}.${operationName}`,
        operation
      );
    },
    end: () => {
      const duration = performance.now() - startTime;
      trackComponentRender(componentName, duration);
    },
  };
}

/**
 * Shutdown tracer provider
 */
export async function shutdownTracing(): Promise<void> {
  if (tracerProvider) {
    await tracerProvider.shutdown();
    tracerProvider = null;
    console.log('OpenTelemetry tracing shut down');
  }
}

// Auto-shutdown on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    shutdownTracing();
  });
}

export default {
  initializeTracing,
  getTracer,
  startSpan,
  trackAsyncOperation,
  trackSyncOperation,
  trackApiRequest,
  trackUserInteraction,
  trackNavigation,
  trackComponentRender,
  trackDataFetch,
  trackSearch,
  trackFormSubmission,
  addSpanEvent,
  setSpanAttribute,
  useTracing,
  shutdownTracing,
};
