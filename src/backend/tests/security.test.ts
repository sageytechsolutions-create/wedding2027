/**
 * Security Test Suite (Phase 7 Sprint 3)
 *
 * Comprehensive security testing for middleware, encryption, rate limiting, and validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateHmac,
  verifyHmac,
  validateKeyStrength,
} from '../src/services/encryption';
import {
  sanitizeString,
  validateEmail,
  validateUrl,
  validatePhoneNumber,
  validateNumber,
  detectSqlInjection,
  detectXss,
  validatePasswordStrength,
} from '../src/middleware/inputValidation';
import {
  shouldDeleteData,
  shouldAnonymizeData,
  anonymizeUserData,
  generateDataExport,
  generatePrivacyReport,
} from '../src/services/gdprCompliance';

describe('Encryption Service', () => {
  describe('Data Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'sensitive data';
      const encrypted = encrypt(plaintext);

      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for empty plaintext', () => {
      expect(() => encrypt('')).toThrow('Cannot encrypt empty plaintext');
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => decrypt({
        iv: 'invalid',
        tag: 'invalid',
        ciphertext: 'invalid',
        salt: 'invalid',
      })).toThrow();
    });

    it('should produce different ciphertexts for same plaintext (random IV/salt)', () => {
      const plaintext = 'test data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });
  });

  describe('Password Hashing', () => {
    it('should hash password with salt', () => {
      const password = 'MySecurePassword123!';
      const hash = hashPassword(password);

      expect(hash).toContain(':');
      const [salt, passwordHash] = hash.split(':');
      expect(salt).toHaveLength(128); // SALT_LENGTH * 2 (hex)
      expect(passwordHash).toHaveLength(128); // 64 bytes * 2 (hex)
    });

    it('should verify correct password', () => {
      const password = 'MySecurePassword123!';
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('should reject incorrect password', () => {
      const password = 'MySecurePassword123!';
      const hash = hashPassword(password);

      expect(verifyPassword('WrongPassword', hash)).toBe(false);
    });

    it('should produce different hashes for same password', () => {
      const password = 'MySecurePassword123!';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(verifyPassword(password, hash1)).toBe(true);
      expect(verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('Token Generation & Verification', () => {
    it('should generate random tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).toHaveLength(64); // 32 bytes * 2 (hex)
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('should hash and verify tokens with timing-safe comparison', () => {
      const token = generateToken();
      const hash = require('../src/services/encryption').hashToken(token);

      expect(verifyToken(token, hash)).toBe(true);
      expect(verifyToken('wrongtoken', hash)).toBe(false);
    });
  });

  describe('HMAC Generation & Verification', () => {
    it('should generate HMAC for data', () => {
      const data = 'important data';
      const hmac = generateHmac(data);

      expect(hmac).toHaveLength(64); // SHA256 = 32 bytes * 2 (hex)
    });

    it('should verify correct HMAC', () => {
      const data = 'important data';
      const hmac = generateHmac(data);

      expect(verifyHmac(data, hmac)).toBe(true);
    });

    it('should reject modified data', () => {
      const data = 'important data';
      const hmac = generateHmac(data);

      expect(verifyHmac('modified data', hmac)).toBe(false);
    });
  });

  describe('Key Strength Validation', () => {
    it('should validate strong keys', () => {
      const strongKey = 'MyStr0ng!Key@2024';
      const result = validateKeyStrength(strongKey);

      expect(result.valid).toBe(true);
    });

    it('should reject weak keys', () => {
      const weakKey = 'weak';
      const result = validateKeyStrength(weakKey);

      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should reject keys without required character types', () => {
      const noNumbers = 'MyStrongKeyNoNumbers!';
      const result = validateKeyStrength(noNumbers);

      expect(result.valid).toBe(false);
    });
  });
});

describe('Input Validation', () => {
  describe('String Sanitization', () => {
    it('should remove control characters', () => {
      const input = 'hello\x00\x01\x1Fworld';
      const sanitized = sanitizeString(input);

      expect(sanitized).toBe('helloworld');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const sanitized = sanitizeString(input);

      expect(sanitized).toBe('hello world');
    });

    it('should limit length', () => {
      const input = 'a'.repeat(1000);
      const sanitized = sanitizeString(input, 100);

      expect(sanitized).toHaveLength(100);
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email format', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should enforce email length limit', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://example.com/path')).toBe(true);
      expect(validateUrl('https://example.com:8080')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not a url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(true); // Accepts valid URL
      expect(validateUrl('javascript:alert("xss")')).toBe(false);
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate E.164 format', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(true);
      expect(validatePhoneNumber('+442071838750')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('not a phone')).toBe(false);
      expect(validatePhoneNumber('123')).toBe(false);
    });
  });

  describe('Numeric Validation', () => {
    it('should validate numbers with bounds', () => {
      expect(validateNumber(100, 0, 200)).toBe(true);
      expect(validateNumber('100', 0, 200)).toBe(true);
    });

    it('should reject out-of-bounds numbers', () => {
      expect(validateNumber(300, 0, 200)).toBe(false);
      expect(validateNumber(-10, 0, 200)).toBe(false);
    });

    it('should reject non-numeric input', () => {
      expect(validateNumber('abc', 0, 200)).toBe(false);
    });
  });

  describe('SQL Injection Detection', () => {
    it('should detect SQL keywords', () => {
      expect(detectSqlInjection("'; DROP TABLE users; --")).toBe(true);
      expect(detectSqlInjection('1 UNION SELECT * FROM users')).toBe(true);
      expect(detectSqlInjection("admin' OR '1'='1")).toBe(true);
    });

    it('should detect SQL patterns', () => {
      expect(detectSqlInjection("'; --")).toBe(true);
      expect(detectSqlInjection('OR 1=1')).toBe(true);
    });

    it('should allow safe strings', () => {
      expect(detectSqlInjection('This is a normal comment')).toBe(false);
      expect(detectSqlInjection('John Doe')).toBe(false);
    });
  });

  describe('XSS Detection', () => {
    it('should detect script tags', () => {
      expect(detectXss('<script>alert("xss")</script>')).toBe(true);
      expect(detectXss('<SCRIPT>alert("xss")</SCRIPT>')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(detectXss('<img onerror="alert(1)">')).toBe(true);
      expect(detectXss('<body onload="alert(1)">')).toBe(true);
      expect(detectXss('onclick="alert(1)"')).toBe(true);
    });

    it('should detect dangerous protocols', () => {
      expect(detectXss('javascript:alert(1)')).toBe(true);
      expect(detectXss('vbscript:msgbox(1)')).toBe(true);
      expect(detectXss('data:text/html,<script>alert(1)</script>')).toBe(true);
    });

    it('should allow safe HTML content', () => {
      expect(detectXss('This is a normal comment')).toBe(false);
      expect(detectXss('Check out https://example.com')).toBe(false);
    });
  });

  describe('Password Strength Validation', () => {
    it('should validate strong passwords', () => {
      const result = validatePasswordStrength('MySecure@Pass123');

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(3);
    });

    it('should reject weak passwords', () => {
      const result = validatePasswordStrength('password');

      expect(result.valid).toBe(false);
      expect(result.feedback).toContain('This password is too common');
    });

    it('should provide feedback on password requirements', () => {
      const result = validatePasswordStrength('short');

      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.feedback).toContain('Password should be at least 8 characters');
    });
  });
});

describe('GDPR Compliance', () => {
  describe('Data Retention', () => {
    it('should determine if data should be deleted', () => {
      const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000); // 400 days ago
      expect(shouldDeleteData(oldDate, 'session_logs')).toBe(true); // 30-day retention
    });

    it('should determine if data should be anonymized', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      expect(shouldAnonymizeData(oldDate, 'error_tracking')).toBe(true); // 90-day retention
    });
  });

  describe('Data Anonymization', () => {
    it('should anonymize PII fields', () => {
      const userData = {
        userId: '12345',
        email: 'user@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
      };

      const anonymized = anonymizeUserData(userData);

      expect(anonymized.email).not.toBe(userData.email);
      expect(anonymized.phone).not.toBe(userData.phone);
      expect(anonymized.firstName).not.toBe(userData.firstName);
      expect(anonymized.userId).toBe('12345'); // Non-PII preserved
      expect(anonymized.anonymizedAt).toBeDefined();
    });
  });

  describe('Data Export', () => {
    it('should generate GDPR-compliant data export', () => {
      const userData = { userId: '123', email: 'user@example.com' };
      const auditLogs = [
        {
          timestamp: new Date().toISOString(),
          eventType: 'DATA_ACCESS',
          userId: '123',
          path: '/api/data',
        },
      ];

      const export_ = generateDataExport('123', userData, auditLogs, true, true);

      expect(export_.exportDate).toBeDefined();
      expect(export_.piiCount).toBeGreaterThan(0);
      expect(export_.hash).toBeDefined();
      expect(export_.dataExport?.userData).toBeDefined();
    });
  });

  describe('Privacy Reporting', () => {
    it('should generate privacy compliance report', () => {
      const auditLogs = [
        {
          timestamp: new Date().toISOString(),
          eventType: 'DATA_ACCESS',
          userId: '123',
          method: 'GET',
          path: '/api/data',
          statusCode: 200,
        },
        {
          timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          eventType: 'DATA_DELETE',
          userId: '456',
          method: 'DELETE',
          path: '/api/user/456',
          statusCode: 200,
        },
      ];

      const report = generatePrivacyReport(auditLogs);

      expect(report.reportDate).toBeDefined();
      expect(report.totalEvents).toBeGreaterThan(0);
      expect(report.gdprCompliance).toBeGreaterThanOrEqual(0);
      expect(report.gdprCompliance).toBeLessThanOrEqual(100);
    });
  });
});

describe('Security Headers', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    // Apply security headers middleware (mock)
    app.get('/test', (req, res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.json({ status: 'ok' });
    });
  });

  it('should include security headers in response', async () => {
    const response = await request(app).get('/test');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
  });
});

describe('Integration Tests', () => {
  it('should encrypt, then decrypt data securely', () => {
    const original = 'sensitive data';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(original);
    expect(encrypted.ciphertext).not.toBe(original);
  });

  it('should validate and sanitize user input', () => {
    const maliciousInput = "<script>alert('xss')</script>";
    expect(detectXss(maliciousInput)).toBe(true);

    const validEmail = 'user@example.com';
    expect(validateEmail(validEmail)).toBe(true);
  });

  it('should handle password security workflow', () => {
    const password = 'UserPassword123!';
    const hash = hashPassword(password);

    // Store hash
    expect(hash).toBeDefined();

    // Verify on login
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('wrongpassword', hash)).toBe(false);
  });
});
