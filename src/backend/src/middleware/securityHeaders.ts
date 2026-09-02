/**
 * Security Headers Middleware (Phase 7 Sprint 3)
 *
 * Implements OWASP security best practices for HTTP headers,
 * protecting against common web vulnerabilities.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Configure Content Security Policy
 */
export function contentSecurityPolicy(req: Request, res: Response, next: NextFunction): void {
  const isDev = process.env.NODE_ENV === 'development';

  const cspHeader = isDev
    ? "default-src 'self' http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:*"
    : "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.ai-realestate.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

  res.setHeader('Content-Security-Policy', cspHeader);
  next();
}

/**
 * Configure HTTP Strict Transport Security
 */
export function hsts(req: Request, res: Response, next: NextFunction): void {
  const maxAge = 31536000; // 1 year
  const includeSubDomains = true;
  const preload = true;

  let hstsValue = `max-age=${maxAge}`;
  if (includeSubDomains) hstsValue += '; includeSubDomains';
  if (preload) hstsValue += '; preload';

  res.setHeader('Strict-Transport-Security', hstsValue);
  next();
}

/**
 * Prevent clickjacking attacks
 */
export function xFrameOptions(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}

/**
 * Prevent MIME type sniffing
 */
export function xContentTypeOptions(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}

/**
 * Enable XSS protection
 */
export function xXssProtection(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}

/**
 * Referrer Policy
 */
export function referrerPolicy(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

/**
 * Permissions Policy (formerly Feature Policy)
 */
export function permissionsPolicy(req: Request, res: Response, next: NextFunction): void {
  const policy = [
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'camera=()',
    'cross-origin-isolated=()',
    'display-capture=()',
    'document-domain=()',
    'encrypted-media=()',
    'execution-while-not-rendered=()',
    'execution-while-out-of-viewport=()',
    'fullscreen=(self)',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'navigation-override=()',
    'payment=()',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'sync-xhr=()',
    'usb=()',
    'vr=()',
    'xr-spatial-tracking=()',
  ].join(', ');

  res.setHeader('Permissions-Policy', policy);
  next();
}

/**
 * Remove server header to avoid version disclosure
 */
export function removeServerHeader(req: Request, res: Response, next: NextFunction): void {
  res.removeHeader('Server');
  res.setHeader('Server', 'AI-RealEstate/1.0');
  next();
}

/**
 * Configure CORS headers securely
 */
export function secureCors(
  allowedOrigins: string[] = ['https://ai-realestate.com', 'https://app.ai-realestate.com']
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '3600');
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  };
}

/**
 * Rate limiting headers
 */
export function rateLimitHeaders(
  limit: number = 100,
  window: number = 900 // 15 minutes
) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('RateLimit-Limit', limit.toString());
    res.setHeader('RateLimit-Window', window.toString());
    res.setHeader('RateLimit-Remaining', Math.max(0, limit - 1).toString());
    res.setHeader('RateLimit-Reset', new Date(Date.now() + window * 1000).toISOString());
    next();
  };
}

/**
 * Prevent cache poisoning
 */
export function cacheControl(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  } else if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=300');
  } else {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
  }
  next();
}

/**
 * Pragma header for HTTP/1.0 compatibility
 */
export function pragmaHeader(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Pragma', 'no-cache');
  next();
}

/**
 * Setup all security headers
 */
export function setupSecurityHeaders(app: any, corsOrigins?: string[]): void {
  // Content security and XSS protection
  app.use(contentSecurityPolicy);
  app.use(xContentTypeOptions);
  app.use(xXssProtection);

  // Clickjacking and framing protection
  app.use(xFrameOptions);

  // Transport security
  app.use(hsts);

  // Information disclosure prevention
  app.use(removeServerHeader);
  app.use(referrerPolicy);
  app.use(permissionsPolicy);

  // CORS security
  app.use(secureCors(corsOrigins));

  // Cache security
  app.use(cacheControl);
  app.use(pragmaHeader);
}

export default {
  contentSecurityPolicy,
  hsts,
  xFrameOptions,
  xContentTypeOptions,
  xXssProtection,
  referrerPolicy,
  permissionsPolicy,
  removeServerHeader,
  secureCors,
  rateLimitHeaders,
  cacheControl,
  pragmaHeader,
  setupSecurityHeaders,
};
