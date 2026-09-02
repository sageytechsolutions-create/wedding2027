/**
 * Performance Monitoring & Profiling Service (Phase 7 Sprint 4)
 *
 * Monitors and analyzes application performance metrics,
 * identifying bottlenecks and optimization opportunities.
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

export interface PerformanceMetric {
  name: string;
  duration: number; // milliseconds
  timestamp: string;
  tags?: Record<string, string | number>;
  warning?: boolean;
  critical?: boolean;
}

export interface EndpointMetrics {
  path: string;
  method: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorCount: number;
  errorRate: number;
}

export interface DatabaseMetric {
  query: string;
  duration: number;
  rowsAffected: number;
  timestamp: string;
  slow?: boolean;
}

export interface CacheMetric {
  operation: 'get' | 'set' | 'delete' | 'clear';
  key: string;
  duration: number;
  hit?: boolean;
  size?: number;
}

const metrics: PerformanceMetric[] = [];
const endpointMetrics: Map<string, EndpointMetrics> = new Map();
const databaseMetrics: DatabaseMetric[] = [];
const cacheMetrics: CacheMetric[] = [];
const MAX_METRICS_SIZE = 100000;

// Performance thresholds
export const THRESHOLDS = {
  API_WARNING: 500,      // 500ms
  API_CRITICAL: 1000,    // 1000ms
  DB_WARNING: 1000,      // 1 second
  DB_CRITICAL: 5000,     // 5 seconds
  CACHE_WARNING: 100,    // 100ms
  CACHE_CRITICAL: 500,   // 500ms
};

/**
 * Record performance metric
 */
export function recordMetric(
  name: string,
  duration: number,
  tags?: Record<string, string | number>
): PerformanceMetric {
  const warning = duration > THRESHOLDS.API_WARNING;
  const critical = duration > THRESHOLDS.API_CRITICAL;

  const metric: PerformanceMetric = {
    name,
    duration,
    timestamp: new Date().toISOString(),
    tags,
    warning,
    critical,
  };

  metrics.push(metric);

  // Trim metrics if too large
  if (metrics.length > MAX_METRICS_SIZE) {
    metrics.shift();
  }

  return metric;
}

/**
 * Record endpoint metrics
 */
export function recordEndpointMetric(
  path: string,
  method: string,
  duration: number,
  statusCode: number
): void {
  const key = `${method}:${path}`;
  const existing = endpointMetrics.get(key) || {
    path,
    method,
    count: 0,
    avgDuration: 0,
    minDuration: duration,
    maxDuration: duration,
    p50: 0,
    p95: 0,
    p99: 0,
    errorCount: 0,
    errorRate: 0,
  };

  existing.count += 1;
  existing.avgDuration = (existing.avgDuration * (existing.count - 1) + duration) / existing.count;
  existing.minDuration = Math.min(existing.minDuration, duration);
  existing.maxDuration = Math.max(existing.maxDuration, duration);

  if (statusCode >= 400) {
    existing.errorCount += 1;
  }

  existing.errorRate = existing.errorCount / existing.count;

  endpointMetrics.set(key, existing);
}

/**
 * Record database metric
 */
export function recordDatabaseMetric(
  query: string,
  duration: number,
  rowsAffected: number = 0
): DatabaseMetric {
  const slow = duration > THRESHOLDS.DB_CRITICAL;

  const metric: DatabaseMetric = {
    query: query.substring(0, 200), // Truncate for storage
    duration,
    rowsAffected,
    timestamp: new Date().toISOString(),
    slow,
  };

  databaseMetrics.push(metric);

  if (databaseMetrics.length > MAX_METRICS_SIZE) {
    databaseMetrics.shift();
  }

  return metric;
}

/**
 * Record cache metric
 */
export function recordCacheMetric(
  operation: 'get' | 'set' | 'delete' | 'clear',
  key: string,
  duration: number,
  hit?: boolean,
  size?: number
): CacheMetric {
  const metric: CacheMetric = {
    operation,
    key,
    duration,
    hit,
    size,
  };

  cacheMetrics.push(metric);

  if (cacheMetrics.length > MAX_METRICS_SIZE) {
    cacheMetrics.shift();
  }

  return metric;
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitoringMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();
  const startMem = process.memoryUsage();

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const endMem = process.memoryUsage();

    const memoryDelta = {
      heapUsed: endMem.heapUsed - startMem.heapUsed,
      external: endMem.external - startMem.external,
    };

    recordEndpointMetric(req.path, req.method, duration, res.statusCode);
    recordMetric(`api:${req.method}:${req.path}`, duration, {
      statusCode: res.statusCode,
      memoryDelta: memoryDelta.heapUsed,
    });

    // Set performance headers
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
    res.setHeader('X-Memory-Delta', `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Get endpoint metrics summary
 */
export function getEndpointMetrics(path?: string, method?: string): EndpointMetrics[] {
  let result = Array.from(endpointMetrics.values());

  if (path) {
    result = result.filter((m) => m.path === path);
  }

  if (method) {
    result = result.filter((m) => m.method === method);
  }

  return result.sort((a, b) => b.avgDuration - a.avgDuration);
}

/**
 * Get slow endpoints
 */
export function getSlowEndpoints(threshold: number = THRESHOLDS.API_WARNING): EndpointMetrics[] {
  return Array.from(endpointMetrics.values())
    .filter((m) => m.avgDuration > threshold)
    .sort((a, b) => b.avgDuration - a.avgDuration);
}

/**
 * Get database performance metrics
 */
export function getDatabaseMetrics(limit: number = 100): {
  slowQueries: DatabaseMetric[];
  avgDuration: number;
  totalQueries: number;
  slowQueryPercentage: number;
} {
  const slowQueries = databaseMetrics
    .filter((m) => m.slow)
    .slice(-limit);

  const avgDuration = databaseMetrics.length > 0
    ? databaseMetrics.reduce((sum, m) => sum + m.duration, 0) / databaseMetrics.length
    : 0;

  const slowQueryPercentage = databaseMetrics.length > 0
    ? (databaseMetrics.filter((m) => m.slow).length / databaseMetrics.length) * 100
    : 0;

  return {
    slowQueries,
    avgDuration,
    totalQueries: databaseMetrics.length,
    slowQueryPercentage,
  };
}

/**
 * Get cache performance metrics
 */
export function getCacheMetrics(): {
  hitRate: number;
  missRate: number;
  avgGetDuration: number;
  avgSetDuration: number;
  totalOperations: number;
} {
  const gets = cacheMetrics.filter((m) => m.operation === 'get');
  const sets = cacheMetrics.filter((m) => m.operation === 'set');

  const hits = gets.filter((m) => m.hit).length;
  const hitRate = gets.length > 0 ? (hits / gets.length) * 100 : 0;
  const missRate = 100 - hitRate;

  const avgGetDuration = gets.length > 0
    ? gets.reduce((sum, m) => sum + m.duration, 0) / gets.length
    : 0;

  const avgSetDuration = sets.length > 0
    ? sets.reduce((sum, m) => sum + m.duration, 0) / sets.length
    : 0;

  return {
    hitRate,
    missRate,
    avgGetDuration,
    avgSetDuration,
    totalOperations: cacheMetrics.length,
  };
}

/**
 * Get performance report
 */
export function getPerformanceReport(): Record<string, any> {
  const endpoints = getEndpointMetrics();
  const slowEndpoints = getSlowEndpoints();
  const dbMetrics = getDatabaseMetrics();
  const cacheMetrics_ = getCacheMetrics();

  // Calculate percentiles for all endpoints
  const allDurations = Array.from(endpointMetrics.values())
    .flatMap((m) => Array(m.count).fill(m.avgDuration))
    .sort((a, b) => a - b);

  const p50 = allDurations[Math.floor(allDurations.length * 0.5)] || 0;
  const p95 = allDurations[Math.floor(allDurations.length * 0.95)] || 0;
  const p99 = allDurations[Math.floor(allDurations.length * 0.99)] || 0;

  return {
    reportDate: new Date().toISOString(),
    endpoints: {
      total: endpoints.length,
      avgDuration: endpoints.length > 0
        ? endpoints.reduce((sum, m) => sum + m.avgDuration, 0) / endpoints.length
        : 0,
      p50,
      p95,
      p99,
      slowEndpoints: slowEndpoints.slice(0, 10),
      errorRate: endpoints.length > 0
        ? endpoints.reduce((sum, m) => sum + m.errorRate, 0) / endpoints.length
        : 0,
    },
    database: {
      avgDuration: dbMetrics.avgDuration,
      totalQueries: dbMetrics.totalQueries,
      slowQueryPercentage: dbMetrics.slowQueryPercentage,
      slowQueries: dbMetrics.slowQueries.slice(0, 5),
    },
    cache: {
      hitRate: cacheMetrics_.hitRate.toFixed(2),
      missRate: cacheMetrics_.missRate.toFixed(2),
      avgGetDuration: cacheMetrics_.avgGetDuration.toFixed(2),
      avgSetDuration: cacheMetrics_.avgSetDuration.toFixed(2),
      totalOperations: cacheMetrics_.totalOperations,
    },
    memory: {
      heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2),
      external: (process.memoryUsage().external / 1024 / 1024).toFixed(2),
      rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
    },
    recommendations: generatePerformanceRecommendations(
      slowEndpoints,
      dbMetrics,
      cacheMetrics_
    ),
  };
}

/**
 * Generate performance recommendations
 */
export function generatePerformanceRecommendations(
  slowEndpoints: EndpointMetrics[],
  dbMetrics: any,
  cacheMetrics_: any
): string[] {
  const recommendations: string[] = [];

  // Endpoint recommendations
  if (slowEndpoints.length > 0) {
    recommendations.push(
      `⚠️ ${slowEndpoints.length} endpoints with avg duration > ${THRESHOLDS.API_WARNING}ms`
    );

    const slowest = slowEndpoints[0];
    if (slowest.avgDuration > THRESHOLDS.API_CRITICAL) {
      recommendations.push(
        `🔴 CRITICAL: ${slowest.method} ${slowest.path} averaging ${slowest.avgDuration.toFixed(0)}ms`
      );
    }
  }

  // Database recommendations
  if (dbMetrics.slowQueryPercentage > 10) {
    recommendations.push(
      `⚠️ ${dbMetrics.slowQueryPercentage.toFixed(1)}% of queries exceed ${THRESHOLDS.DB_CRITICAL}ms threshold`
    );
    recommendations.push('✅ Consider: Add database indexes, optimize N+1 queries, enable query caching');
  }

  // Cache recommendations
  if (cacheMetrics_.hitRate < 60) {
    recommendations.push(
      `⚠️ Cache hit rate low at ${cacheMetrics_.hitRate.toFixed(1)}%`
    );
    recommendations.push('✅ Consider: Increase cache TTL, add more cache keys, review cache strategy');
  }

  // Memory recommendations
  const heapUsedPercent = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
  if (heapUsedPercent > 85) {
    recommendations.push(
      `⚠️ Heap usage high at ${heapUsedPercent.toFixed(1)}%`
    );
    recommendations.push('✅ Consider: Optimize data structures, enable streaming, increase Node.js heap size');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Performance looks good!');
  }

  return recommendations;
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
  databaseMetrics.length = 0;
  cacheMetrics.length = 0;
  endpointMetrics.clear();
}

export default {
  recordMetric,
  recordEndpointMetric,
  recordDatabaseMetric,
  recordCacheMetric,
  performanceMonitoringMiddleware,
  getEndpointMetrics,
  getSlowEndpoints,
  getDatabaseMetrics,
  getCacheMetrics,
  getPerformanceReport,
  generatePerformanceRecommendations,
  clearMetrics,
  THRESHOLDS,
};
