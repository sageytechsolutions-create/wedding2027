/**
 * Security Audit Logging Middleware (Phase 7 Sprint 3)
 *
 * Logs security-relevant events for compliance and forensic analysis.
 */

import { Request, Response, NextFunction } from 'express';
import { addBreadcrumb } from '../services/errorTracking';

export interface AuditEvent {
  timestamp: string;
  eventType: string;
  userId?: string;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  statusCode?: number;
  details?: Record<string, any>;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

const auditLog: AuditEvent[] = [];
const MAX_AUDIT_LOG_SIZE = 10000;

/**
 * Log security audit event
 */
export function logSecurityEvent(
  eventType: string,
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
  req: Request,
  details?: Record<string, any>
): AuditEvent {
  const event: AuditEvent = {
    timestamp: new Date().toISOString(),
    eventType,
    userId: (req.user as any)?.id,
    ip: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    path: req.path,
    method: req.method,
    details,
    severity,
  };

  // Add to in-memory log
  auditLog.push(event);

  // Trim log if too large
  if (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.shift();
  }

  // Log to monitoring system
  addBreadcrumb(
    `Security Event: ${eventType} (${severity})`,
    'security_audit',
    severity === 'critical' || severity === 'high' ? 'warning' : 'info',
    details
  );

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUDIT] ${eventType} - ${severity}:`, event);
  }

  return event;
}

/**
 * Audit successful authentication
 */
export function auditAuthSuccess(req: Request, userId: string): void {
  logSecurityEvent(
    'AUTH_SUCCESS',
    'info',
    req,
    {
      userId,
      method: 'email',
    }
  );
}

/**
 * Audit failed authentication
 */
export function auditAuthFailure(
  req: Request,
  reason: string,
  email?: string
): void {
  logSecurityEvent(
    'AUTH_FAILURE',
    'high',
    req,
    {
      reason,
      email: email ? email.substring(0, 3) + '***' : 'unknown',
    }
  );
}

/**
 * Audit privilege escalation attempt
 */
export function auditPrivilegeEscalation(
  req: Request,
  attemptedRole: string
): void {
  logSecurityEvent(
    'PRIVILEGE_ESCALATION_ATTEMPT',
    'critical',
    req,
    {
      userId: (req.user as any)?.id,
      attemptedRole,
      currentRole: (req.user as any)?.role,
    }
  );
}

/**
 * Audit unauthorized access attempt
 */
export function auditUnauthorizedAccess(
  req: Request,
  resource: string,
  reason: string
): void {
  logSecurityEvent(
    'UNAUTHORIZED_ACCESS',
    'high',
    req,
    {
      userId: (req.user as any)?.id,
      resource,
      reason,
    }
  );
}

/**
 * Audit data access
 */
export function auditDataAccess(
  req: Request,
  dataType: string,
  recordCount: number,
  filters?: Record<string, any>
): void {
  logSecurityEvent(
    'DATA_ACCESS',
    'info',
    req,
    {
      userId: (req.user as any)?.id,
      dataType,
      recordCount,
      filters,
    }
  );
}

/**
 * Audit data modification
 */
export function auditDataModification(
  req: Request,
  action: 'create' | 'update' | 'delete',
  dataType: string,
  recordId: string,
  changes?: Record<string, any>
): void {
  logSecurityEvent(
    `DATA_${action.toUpperCase()}`,
    'medium',
    req,
    {
      userId: (req.user as any)?.id,
      dataType,
      recordId,
      changes,
    }
  );
}

/**
 * Audit security configuration changes
 */
export function auditSecurityConfigChange(
  req: Request,
  setting: string,
  oldValue: any,
  newValue: any
): void {
  logSecurityEvent(
    'SECURITY_CONFIG_CHANGE',
    'high',
    req,
    {
      userId: (req.user as any)?.id,
      setting,
      oldValue: typeof oldValue === 'string' ? oldValue.substring(0, 10) : oldValue,
      newValue: typeof newValue === 'string' ? newValue.substring(0, 10) : newValue,
    }
  );
}

/**
 * Audit suspicious activity
 */
export function auditSuspiciousActivity(
  req: Request,
  activityType: string,
  details: Record<string, any>
): void {
  logSecurityEvent(
    'SUSPICIOUS_ACTIVITY',
    'high',
    req,
    {
      userId: (req.user as any)?.id,
      activityType,
      ...details,
    }
  );
}

/**
 * Audit compliance-related events
 */
export function auditComplianceEvent(
  req: Request,
  eventType: string,
  details: Record<string, any>
): void {
  logSecurityEvent(
    `COMPLIANCE_${eventType}`,
    'medium',
    req,
    {
      userId: (req.user as any)?.id,
      ...details,
    }
  );
}

/**
 * Security audit middleware
 */
export function securityAuditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture response
  const originalJson = res.json;
  res.json = function (data: any) {
    const duration = Date.now() - startTime;

    // Audit successful authentication
    if (req.path === '/auth/login' && res.statusCode === 200) {
      auditAuthSuccess(req, data.user?.id);
    }

    // Audit failed authentication
    if (req.path === '/auth/login' && res.statusCode >= 400) {
      auditAuthFailure(req, 'Invalid credentials');
    }

    // Audit sensitive data access
    if (req.path.includes('/admin/') || req.path.includes('/users/')) {
      auditDataAccess(req, req.path, 1);
    }

    // Log slow requests (potential DoS)
    if (duration > 5000) {
      auditSuspiciousActivity(req, 'SLOW_REQUEST', {
        duration,
        path: req.path,
      });
    }

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Get audit log
 */
export function getAuditLog(
  filter?: {
    eventType?: string;
    severity?: string;
    userId?: string;
    startTime?: string;
    endTime?: string;
  }
): AuditEvent[] {
  let logs = [...auditLog];

  if (filter?.eventType) {
    logs = logs.filter((log) => log.eventType === filter.eventType);
  }

  if (filter?.severity) {
    logs = logs.filter((log) => log.severity === filter.severity);
  }

  if (filter?.userId) {
    logs = logs.filter((log) => log.userId === filter.userId);
  }

  if (filter?.startTime) {
    const startTime = new Date(filter.startTime).getTime();
    logs = logs.filter((log) => new Date(log.timestamp).getTime() >= startTime);
  }

  if (filter?.endTime) {
    const endTime = new Date(filter.endTime).getTime();
    logs = logs.filter((log) => new Date(log.timestamp).getTime() <= endTime);
  }

  return logs.reverse(); // Most recent first
}

/**
 * Clear audit log
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

/**
 * Export audit log
 */
export function exportAuditLog(format: 'json' | 'csv' = 'json'): string {
  if (format === 'json') {
    return JSON.stringify(getAuditLog(), null, 2);
  }

  // CSV format
  const headers = [
    'timestamp',
    'eventType',
    'userId',
    'ip',
    'path',
    'method',
    'statusCode',
    'severity',
  ];

  const rows = getAuditLog().map((log) => [
    log.timestamp,
    log.eventType,
    log.userId || '',
    log.ip,
    log.path,
    log.method,
    log.statusCode || '',
    log.severity,
  ]);

  return (
    headers.join(',') +
    '\n' +
    rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  );
}

export default {
  logSecurityEvent,
  auditAuthSuccess,
  auditAuthFailure,
  auditPrivilegeEscalation,
  auditUnauthorizedAccess,
  auditDataAccess,
  auditDataModification,
  auditSecurityConfigChange,
  auditSuspiciousActivity,
  auditComplianceEvent,
  securityAuditMiddleware,
  getAuditLog,
  clearAuditLog,
  exportAuditLog,
};
