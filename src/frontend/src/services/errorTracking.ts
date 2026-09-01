/**
 * Error Tracking Service (Phase 7 Sprint 2)
 *
 * Sentry integration for frontend error tracking, performance monitoring,
 * and session replay. Captures all errors, exceptions, and performance data
 * for production monitoring and debugging.
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export interface UserContext {
  id: string;
  email: string;
  username?: string;
  subscription?: string;
}

/**
 * Initialize Sentry error tracking
 * Called once at app startup in main.tsx
 */
export function initializeErrorTracking(isDev: boolean = false): void {
  const environment = isDev ? 'development' : 'production';
  const dsn = process.env.REACT_APP_SENTRY_DSN || '';

  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Release tracking
    release: process.env.REACT_APP_VERSION || '1.0.0',
    dist: process.env.REACT_APP_DIST || 'web',

    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    integrations: [
      new BrowserTracing({
        // Capture interactions as transactions
        instrumentPageLoad: true,
        instrumentNavigation: true,
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          window.history
        ),
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
    ],

    // Session replay
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,

    // Performance
    maxBreadcrumbs: 50,
    attachStacktrace: true,
    sendDefaultPii: false,

    // Filtering
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      // Third-party scripts
      /google-analytics/i,
    ],

    ignoreErrors: [
      // Random plugins/extensions
      'top.GLOBALS',
      // Ignore NetworkError on navigation
      'NetworkError',
      // Network request errors from extensions
      /cancelled/i,
      // ResizeObserver
      'ResizeObserver',
    ],
  });
}

/**
 * Set user context for error tracking
 * Called after successful authentication
 */
export function setUserContext(user: UserContext): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    ip_address: '{{auto}}',
  });

  // Custom context
  Sentry.setContext('user', {
    subscription: user.subscription || 'free',
  });
}

/**
 * Clear user context on logout
 */
export function clearUserContext(): void {
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
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info'): string {
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
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
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
 * Get the last event ID for user support
 * Useful for displaying "Report this error" UI
 */
export function getLastEventId(): string | null {
  return Sentry.lastEventId();
}

/**
 * Show the user feedback modal
 * Allows users to describe what happened before the error
 */
export function showFeedbackDialog(): void {
  Sentry.showReplayDialog();
}

/**
 * Track a user action/feature usage
 */
export function trackAction(
  action: string,
  category: string,
  properties?: Record<string, any>
): void {
  addBreadcrumb(action, category, 'info', properties);
}

/**
 * Track navigation events
 */
export function trackNavigation(
  from: string,
  to: string,
  properties?: Record<string, any>
): void {
  addBreadcrumb(`Navigation: ${from} → ${to}`, 'navigation', 'info', {
    from,
    to,
    ...properties,
  });
}

/**
 * Track API calls
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
): void {
  addBreadcrumb(`API: ${method} ${endpoint}`, 'api', 'info', {
    endpoint,
    method,
    statusCode,
    duration,
  });
}

/**
 * Track search actions
 */
export function trackSearch(query: string, resultCount: number): void {
  addBreadcrumb(`Search: "${query}"`, 'search', 'info', {
    query,
    resultCount,
  });
}

/**
 * Track property interactions
 */
export function trackPropertyInteraction(
  propertyId: string,
  action: 'view' | 'click' | 'share' | 'favorite'
): void {
  addBreadcrumb(`Property ${action}: ${propertyId}`, 'property', 'info', {
    propertyId,
    action,
  });
}

/**
 * Set performance baseline expectations
 */
export function setPerformanceThreshold(metricName: string, maxDuration: number): void {
  setTag(`perf_threshold_${metricName}`, maxDuration);
}

/**
 * Capture custom metric
 */
export function captureMetric(
  name: string,
  value: number,
  unit: string = 'ms'
): void {
  Sentry.captureMessage(`Metric: ${name}=${value}${unit}`, 'info');
}

/**
 * Log authentication attempt
 */
export function logAuthAttempt(
  success: boolean,
  method: 'email' | 'oauth' | 'mfa',
  duration?: number
): void {
  const status = success ? 'success' : 'failure';
  addBreadcrumb(`Auth ${status}: ${method}`, 'auth', success ? 'info' : 'warning', {
    method,
    status,
    duration,
  });
}

/**
 * Log payment/transaction event
 */
export function logTransaction(
  transactionId: string,
  amount: number,
  currency: string,
  status: 'success' | 'failed' | 'pending'
): void {
  addBreadcrumb(`Transaction: ${status}`, 'transaction', status === 'success' ? 'info' : 'warning', {
    transactionId,
    amount,
    currency,
    status,
  });
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
 * Setup global error handler for unhandled errors
 */
export function setupGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    captureException(event.error, {
      type: 'unhandled_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason as Error, {
      type: 'unhandled_rejection',
    });
  });
}

/**
 * Profiling helper for measuring function performance
 */
export function profileFunction(name: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();
      const result = originalMethod.apply(this, args);
      const duration = performance.now() - startTime;

      if (duration > 1000) {
        // Log slow operations
        captureMessage(
          `Slow operation: ${name}.${propertyKey} took ${duration.toFixed(2)}ms`,
          'warning'
        );
      }

      return result;
    };

    return descriptor;
  };
}

export default {
  initializeErrorTracking,
  setUserContext,
  clearUserContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  startTransaction,
  setTag,
  setTags,
  getLastEventId,
  showFeedbackDialog,
  trackAction,
  trackNavigation,
  trackApiCall,
  trackSearch,
  trackPropertyInteraction,
  trackAuthAttempt: logAuthAttempt,
  trackTransaction: logTransaction,
  withErrorTracking,
  setupGlobalErrorHandler,
};
