/**
 * Input Validation Middleware (Phase 7 Sprint 3)
 *
 * Validates and sanitizes user input to prevent injection attacks,
 * XSS, and other input-based vulnerabilities.
 */

import { Request, Response, NextFunction } from 'express';
import { addBreadcrumb, trackValidationError } from '../services/errorTracking';

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Validate numeric input
 */
export function validateNumber(
  value: any,
  min?: number,
  max?: number
): boolean {
  const num = Number(value);

  if (isNaN(num)) {
    return false;
  }

  if (min !== undefined && num < min) {
    return false;
  }

  if (max !== undefined && num > max) {
    return false;
  }

  return true;
}

/**
 * Validate required fields
 */
export function validateRequired(
  obj: Record<string, any>,
  fields: string[]
): { valid: boolean; missing: string[] } {
  const missing = fields.filter((field) => !obj[field]);
  return { valid: missing.length === 0, missing };
}

/**
 * Detect potential SQL injection
 */
export function detectSqlInjection(input: string): boolean {
  const sqlKeywords = [
    'union',
    'select',
    'insert',
    'update',
    'delete',
    'drop',
    'create',
    'alter',
    'exec',
    'execute',
    'script',
    'javascript',
    'onerror',
    'onload',
  ];

  const lowerInput = input.toLowerCase();

  for (const keyword of sqlKeywords) {
    if (lowerInput.includes(keyword)) {
      return true;
    }
  }

  // Check for common SQL injection patterns
  const sqlPatterns = [
    /(['";)(--)|(\*|;|\|)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(1\s*=\s*1)/,
    /(\bDROP\b.*\bTABLE\b)/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect potential XSS attempts
 */
export function detectXss(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<img[^>]*onerror/gi,
    /<svg[^>]*onload/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

/**
 * Input validation middleware
 */
export function validateInput(req: Request, res: Response, next: NextFunction): void {
  // Skip file upload endpoints
  if (req.path.includes('/upload')) {
    return next();
  }

  const validationErrors: string[] = [];

  // Validate query parameters
  Object.entries(req.query).forEach(([key, value]) => {
    const stringValue = String(value);

    if (detectSqlInjection(stringValue)) {
      validationErrors.push(`Query parameter '${key}' contains SQL injection attempt`);
    }

    if (detectXss(stringValue)) {
      validationErrors.push(`Query parameter '${key}' contains XSS attempt`);
    }
  });

  // Validate request body
  if (req.body && typeof req.body === 'object') {
    Object.entries(req.body).forEach(([key, value]) => {
      if (typeof value === 'string') {
        if (detectSqlInjection(value)) {
          validationErrors.push(`Body field '${key}' contains SQL injection attempt`);
        }

        if (detectXss(value)) {
          validationErrors.push(`Body field '${key}' contains XSS attempt`);
        }
      }
    });
  }

  if (validationErrors.length > 0) {
    addBreadcrumb(
      `Input validation failed: ${validationErrors.join('; ')}`,
      'validation',
      'warning',
      { path: req.path, method: req.method }
    );

    return res.status(400).json({
      error: {
        message: 'Invalid input detected',
        details: validationErrors,
      },
    });
  }

  // Sanitize inputs for safe processing
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }

  next();
}

/**
 * Validate email endpoint
 */
export function validateEmailEndpoint(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const email = req.body?.email;

  if (!email || !validateEmail(email)) {
    trackValidationError('email', 'Invalid email format', email);
    return res.status(400).json({
      error: { message: 'Invalid email format' },
    });
  }

  next();
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { valid: false, score: 0, feedback: ['Password is required'] };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password should be at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain special characters');
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password',
    '123456',
    'qwerty',
    'admin',
    'letmein',
    'welcome',
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    score = 0;
    feedback.push('This password is too common');
  }

  return {
    valid: score >= 4,
    score,
    feedback,
  };
}

/**
 * Validate password endpoint
 */
export function validatePasswordEndpoint(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const password = req.body?.password;
  const validation = validatePasswordStrength(password);

  if (!validation.valid) {
    trackValidationError('password', 'Weak password', undefined);
    return res.status(400).json({
      error: {
        message: 'Password does not meet security requirements',
        feedback: validation.feedback,
      },
    });
  }

  next();
}

/**
 * Setup all input validation
 */
export function setupInputValidation(app: any): void {
  app.use(validateInput);
}

export default {
  sanitizeString,
  validateEmail,
  validateUrl,
  validatePhoneNumber,
  validateNumber,
  validateRequired,
  detectSqlInjection,
  detectXss,
  validateInput,
  validateEmailEndpoint,
  validatePasswordStrength,
  validatePasswordEndpoint,
  setupInputValidation,
};
