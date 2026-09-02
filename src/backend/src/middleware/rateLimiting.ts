/**
 * Rate Limiting Middleware (Phase 7 Sprint 3)
 *
 * Implements multiple rate limiting strategies to protect against
 * abuse, DDoS, and brute force attacks.
 */

import { Request, Response, NextFunction } from 'express';
import { addBreadcrumb } from '../services/errorTracking';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

/**
 * In-memory rate limit store (use Redis in production)
 */
class RateLimitMemoryStore {
  private store: RateLimitStore = {};

  get(key: string): { count: number; resetTime: number } | undefined {
    return this.store[key];
  }

  set(
    key: string,
    count: number,
    resetTime: number
  ): void {
    this.store[key] = { count, resetTime };
  }

  delete(key: string): void {
    delete this.store[key];
  }

  cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }
}

const memoryStore = new RateLimitMemoryStore();

/**
 * Rate limit middleware factory
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  // Cleanup store every hour
  if (Math.random() < 0.01) {
    memoryStore.cleanup();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if method is OPTIONS
    if (req.method === 'OPTIONS') {
      return next();
    }

    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    let data = memoryStore.get(key);

    // Initialize or reset if window expired
    if (!data || data.resetTime < now) {
      data = { count: 0, resetTime: now + windowMs };
      memoryStore.set(key, data.count, data.resetTime);
    }

    const remaining = Math.max(0, maxRequests - data.count);

    // Set rate limit headers
    res.setHeader('RateLimit-Limit', maxRequests.toString());
    res.setHeader('RateLimit-Remaining', remaining.toString());
    res.setHeader('RateLimit-Reset', new Date(data.resetTime).toISOString());

    // Check if limit exceeded
    if (data.count >= maxRequests) {
      addBreadcrumb(`Rate limit exceeded: ${key}`, 'rate_limit', 'warning', {
        ip: req.ip,
        path: req.path,
        limit: maxRequests,
        window: windowMs,
      });

      return res.status(statusCode).json({
        error: {
          message,
          statusCode,
          retryAfter: Math.ceil((data.resetTime - now) / 1000),
        },
      });
    }

    // Increment counter
    data.count += 1;
    memoryStore.set(key, data.count, data.resetTime);

    // Handle skip conditions
    const originalSend = res.send;
    res.send = function (responseData: any) {
      const status = res.statusCode;
      const isSuccess = status >= 200 && status < 400;
      const isFailure = status >= 400;

      if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && isFailure)) {
        // Don't count this request
        data!.count = Math.max(0, data!.count - 1);
      }

      return originalSend.call(this, responseData);
    };

    next();
  };
}

/**
 * IP-based rate limiter
 */
export function ipRateLimit(maxRequests: number = 1000, windowMs: number = 900000) {
  return rateLimit({
    windowMs,
    maxRequests,
    message: 'Too many requests from this IP',
  });
}

/**
 * User-based rate limiter (requires authentication)
 */
export function userRateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !(req.user as any).id) {
      return next();
    }

    const key = `user:${(req.user as any).id}:${req.path}`;
    const now = Date.now();
    let data = memoryStore.get(key);

    if (!data || data.resetTime < now) {
      data = { count: 0, resetTime: now + windowMs };
      memoryStore.set(key, data.count, data.resetTime);
    }

    const remaining = Math.max(0, maxRequests - data.count);

    res.setHeader('RateLimit-Limit', maxRequests.toString());
    res.setHeader('RateLimit-Remaining', remaining.toString());

    if (data.count >= maxRequests) {
      addBreadcrumb(`User rate limit exceeded: ${(req.user as any).id}`, 'rate_limit', 'warning');
      return res.status(429).json({
        error: { message: 'Rate limit exceeded', retryAfter: Math.ceil((data.resetTime - now) / 1000) },
      });
    }

    data.count += 1;
    memoryStore.set(key, data.count, data.resetTime);
    next();
  };
}

/**
 * Endpoint-specific rate limiter
 */
export function endpointRateLimit(
  maxRequests: number = 10,
  windowMs: number = 60000
) {
  return rateLimit({
    windowMs,
    maxRequests,
    message: 'Too many requests to this endpoint',
  });
}

/**
 * Authentication attempt rate limiter (brute force protection)
 */
export function authRateLimit(maxAttempts: number = 5, windowMs: number = 900000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== '/auth/login') {
      return next();
    }

    const email = req.body?.email || 'unknown';
    const key = `auth:${email}`;
    const now = Date.now();
    let data = memoryStore.get(key);

    if (!data || data.resetTime < now) {
      data = { count: 0, resetTime: now + windowMs };
      memoryStore.set(key, data.count, data.resetTime);
    }

    if (data.count >= maxAttempts) {
      addBreadcrumb(
        `Brute force attempt detected: ${email}`,
        'auth_attack',
        'warning',
        { email, attempts: data.count }
      );

      return res.status(429).json({
        error: {
          message: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((data.resetTime - now) / 1000),
        },
      });
    }

    data.count += 1;
    memoryStore.set(key, data.count, data.resetTime);

    // Handle login response
    const originalJson = res.json;
    res.json = function (responseData: any) {
      // On successful login, reset counter
      if (responseData.token || (responseData.user && !responseData.error)) {
        memoryStore.delete(key);
      }
      return originalJson.call(this, responseData);
    };

    next();
  };
}

/**
 * Global rate limit setup
 */
export function setupRateLimiting(app: any): void {
  // Global IP-based rate limit
  app.use(ipRateLimit(10000, 900000)); // 10k requests per 15 minutes

  // Auth endpoints
  app.use(authRateLimit(5, 900000)); // 5 attempts per 15 minutes

  // API endpoints - stricter
  app.use('/api/', userRateLimit(100, 60000)); // 100 requests per minute per user

  // Public search endpoint
  app.use('/api/properties/search', rateLimit({
    windowMs: 60000,
    maxRequests: 50,
    message: 'Too many search requests',
  }));

  // File upload endpoint
  app.use('/api/files/upload', rateLimit({
    windowMs: 300000, // 5 minutes
    maxRequests: 10,
    message: 'Too many file uploads',
  }));
}

export default {
  rateLimit,
  ipRateLimit,
  userRateLimit,
  endpointRateLimit,
  authRateLimit,
  setupRateLimiting,
  RateLimitMemoryStore,
};
