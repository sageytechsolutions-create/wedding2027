# Security Deployment Procedures - Phase 7 Sprint 3

**Date**: September 1-5, 2026  
**Framework**: OWASP Top 10 2021 & CWE Top 25  
**Deployment Target**: Staging → Production

---

## Pre-Deployment Security Verification

### 1. Security Configuration Review (24 hours before)

```bash
# Verify security headers configuration
npm run validate:security-headers

# Check encryption keys are configured
npm run validate:encryption

# Verify rate limiting settings
npm run validate:rate-limits

# Validate input validation patterns
npm run validate:validation
```

**Checklist:**
- [ ] All environment variables defined in `.env.production`
- [ ] No hardcoded secrets in codebase
- [ ] Encryption keys meet strength requirements
- [ ] Rate limiting thresholds appropriate for expected traffic
- [ ] CORS origins whitelisted (no wildcards in production)
- [ ] Security headers CSP directives finalized

### 2. Dependency Security Audit

```bash
# Run comprehensive dependency scan
npm audit --production
npx snyk test --severity-threshold=high

# Generate SBOM for compliance
npx cyclonedx-npm --output-format json --output-file sbom.json

# Check for known vulnerabilities
npm run check:vulns
```

**Acceptance Criteria:**
- [ ] Zero critical vulnerabilities
- [ ] Zero high-severity vulnerabilities (or documented mitigations)
- [ ] All direct dependencies up-to-date
- [ ] SBOM generated and validated
- [ ] Vulnerability scan results documented

### 3. Code Security Analysis

```bash
# Run security-focused static analysis
npm run lint:security

# CodeQL analysis
npm run analyze:codeql

# Secret scanning
npm run scan:secrets

# SAST analysis
npm run sast
```

**Acceptance Criteria:**
- [ ] No hardcoded credentials detected
- [ ] No OWASP Top 10 patterns found
- [ ] All code review findings resolved
- [ ] Cryptographic operations validated
- [ ] Error handling doesn't leak sensitive data

### 4. Encryption Key Generation

```bash
# Generate production encryption keys (one-time setup)
node scripts/generate-keys.js

# Save keys to secure vault
# AWS Secrets Manager / HashiCorp Vault / Azure Key Vault
npm run vault:store-keys
```

**Key Management:**
- [ ] Master encryption key (32+ characters, mixed case, numbers, special chars)
- [ ] HMAC secret (32+ characters)
- [ ] Keys stored in secure vault (NOT in .env)
- [ ] Backup encryption key created and stored separately
- [ ] Key rotation policy documented
- [ ] Emergency key recovery procedure tested

### 5. Database Security Hardening

```bash
# Create application-specific database user
CREATE USER app_user WITH PASSWORD 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

# Enforce SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET sslcert = '/path/to/server.crt';
ALTER SYSTEM SET sslkey = '/path/to/server.key';
SELECT pg_reload_conf();

# Enable audit logging
CREATE EXTENSION IF NOT EXISTS pgaudit;
ALTER SYSTEM SET pgaudit.log = 'ALL';
```

**Checklist:**
- [ ] Database user has minimal required permissions
- [ ] SSL/TLS enforced for all connections
- [ ] Audit logging enabled
- [ ] Database backups encrypted
- [ ] Backup retention policy configured (minimum 7 days)
- [ ] Point-in-time recovery tested

### 6. API Security Hardening

```typescript
// Verify API security middleware order in index.ts
setupSentryMiddleware(app);        // Error tracking
app.use(express.json());           // Parse JSON
app.use(cors(...));                // CORS
setupSecurityHeaders(app);         // HTTP headers
setupRateLimiting(app);            // Rate limiting
setupInputValidation(app);         // Input validation
app.use(tracingMiddleware);        // Tracing
app.use(securityAuditMiddleware);  // Audit logging
```

**API Endpoints Security Check:**
- [ ] All endpoints protected by rate limiting
- [ ] Authentication required for sensitive endpoints
- [ ] Authorization checks implemented per endpoint
- [ ] Input validation active on all endpoints
- [ ] Error responses don't leak sensitive data
- [ ] CORS properly restricted
- [ ] CSRF tokens generated for state-changing operations

### 7. Session Management Verification

```typescript
// Verify session security settings
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  cookie: {
    secure: true,                    // HTTPS only
    httpOnly: true,                  // No JS access
    sameSite: 'strict',             // CSRF protection
    maxAge: 3600000,                // 1 hour
  },
  resave: false,
  saveUninitialized: false,
};
```

**Checklist:**
- [ ] Session secrets configured
- [ ] Secure cookies enforced
- [ ] HttpOnly flag set
- [ ] SameSite policy configured
- [ ] Session timeout appropriate (1 hour recommended)
- [ ] Session data encrypted
- [ ] Session store cleared on logout

---

## Staging Deployment

### 1. Staging Environment Setup

```bash
# Deploy to staging with security monitoring
npm run deploy:staging

# Verify all security services running
docker-compose -f docker-compose.monitoring.yml up -d

# Initialize monitoring dashboards
npm run setup:monitoring:staging
```

**Verification:**
- [ ] Backend services running
- [ ] Monitoring stack deployed (Prometheus, Grafana, Jaeger)
- [ ] Alertmanager configured
- [ ] Sentry project linked
- [ ] Logging aggregation working

### 2. Security Configuration Validation (Staging)

```bash
# Test security headers
curl -I https://staging.api.example.com/health
# Expected headers:
# - Strict-Transport-Security
# - Content-Security-Policy
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff

# Test rate limiting
for i in {1..100}; do
  curl https://staging.api.example.com/api/data
done
# Expected: 429 Too Many Requests after threshold

# Test input validation
curl -X POST https://staging.api.example.com/api/user \
  -d '{"email":"test@example.com\"; DROP TABLE users; --"}'
# Expected: 400 Bad Request with validation error

# Test encryption
npm run test:encryption:staging
```

**Acceptance Criteria:**
- [ ] Security headers present and correct
- [ ] Rate limiting active
- [ ] Input validation blocking malicious input
- [ ] Encryption/decryption working
- [ ] HTTPS enforced (no HTTP fallback)

### 3. Penetration Testing (Staging)

```bash
# Run automated penetration testing
npm run pentest:staging

# OWASP ZAP baseline scan
zaproxy -cmd -quickurl https://staging.api.example.com \
  -quickout report.html

# Manual security review checklist
npm run security:manual-review
```

**Security Test Coverage:**
- [ ] SQL injection attempts blocked
- [ ] XSS attempts detected and blocked
- [ ] CSRF tokens validated
- [ ] Brute force protection working (5 attempts/15 min)
- [ ] Privilege escalation attempts logged
- [ ] Authentication bypass attempts blocked
- [ ] API authentication enforced
- [ ] Rate limits working correctly

### 4. Compliance Verification (Staging)

```bash
# Generate GDPR compliance report
npm run compliance:gdpr:staging

# Verify audit logging
npm run verify:audit-logs:staging

# Check data encryption
npm run verify:encryption:staging

# Validate retention policies
npm run verify:retention:staging
```

**Compliance Checklist:**
- [ ] GDPR data export functionality working
- [ ] Right-to-be-forgotten process functional
- [ ] Consent management active
- [ ] Audit logging complete
- [ ] Data retention policies enforced
- [ ] Encryption verified
- [ ] PII properly redacted in logs
- [ ] GDPR compliance score > 80%

### 5. Load Testing with Security Enabled

```bash
# Run load test with security middleware
npm run load-test:security:staging

# Monitor for security-related issues
npm run monitor:load-test:staging
```

**Performance Targets:**
- [ ] Response time < 200ms (p95) with security enabled
- [ ] No security middleware timeout issues
- [ ] Rate limiter performs efficiently
- [ ] Memory usage stable under load
- [ ] CPU usage acceptable
- [ ] Error rate < 0.1%

### 6. Security Logging & Monitoring Verification

```bash
# Verify Sentry configuration
npm run verify:sentry:staging

# Check distributed tracing
npm run verify:tracing:staging

# Validate audit logs
npm run verify:audit-logs:staging

# Test alerting
npm run test:alerts:staging
```

**Verification:**
- [ ] Sentry events being captured
- [ ] Distributed traces visible in Jaeger
- [ ] Audit events logged
- [ ] Alerts triggering correctly
- [ ] Slack notifications working
- [ ] Dashboard metrics accurate

---

## Production Deployment

### 1. Production Environment Preparation

```bash
# Pre-deployment checklist
npm run pre-deploy:production

# Database migration
npm run migrate:production

# Verify infrastructure
npm run verify:infra:production
```

**Pre-Production Checklist:**
- [ ] All staging tests passed
- [ ] Security scan completed (0 critical findings)
- [ ] Compliance report generated
- [ ] Rollback procedure documented
- [ ] Incident response team briefed
- [ ] On-call rotation established
- [ ] Backup verified
- [ ] Monitoring alerts configured

### 2. Production Deployment (Blue-Green)

```bash
# Deploy to production (blue environment first)
npm run deploy:production:blue

# Verify deployment
npm run verify:deployment:production:blue

# Run smoke tests
npm run smoke-test:production:blue

# Traffic switch (green)
npm run deploy:production:green
```

**Deployment Verification:**
- [ ] Services starting correctly
- [ ] Health checks passing
- [ ] Monitoring data flowing
- [ ] Alerts configured
- [ ] Tracing working
- [ ] Database connectivity verified
- [ ] Cache/Redis connected
- [ ] Third-party APIs responding

### 3. Security Validation (Production)

```bash
# Validate production security configuration
npm run validate:security:production

# Run production security tests
npm run test:security:production

# Verify encryption keys loaded correctly
npm run verify:keys:production

# Check security headers
curl -I https://api.example.com/health
```

**Production Security Checks:**
- [ ] Security headers present
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] Encryption functional
- [ ] Audit logging enabled
- [ ] Monitoring active
- [ ] Alerts firing correctly

### 4. Post-Deployment Monitoring (24 hours)

```bash
# Monitor error rates
npm run monitor:errors:production

# Check performance metrics
npm run monitor:performance:production

# Verify security logs
npm run monitor:security:production

# Review audit trail
npm run review:audit:production
```

**24-Hour Monitoring Targets:**
- [ ] Error rate stable and low (< 0.5%)
- [ ] Response times normal
- [ ] No security alerts
- [ ] No rate limit issues
- [ ] Audit logs clean
- [ ] User reports: no authentication issues
- [ ] No data corruption detected
- [ ] System resources normal

---

## Rollback Procedures

### Emergency Rollback

```bash
# If critical security issue detected
npm run rollback:production

# Restore from backup if needed
npm run restore:backup:production

# Verify rollback successful
npm run verify:rollback:production

# Notify security team
npm run notify:security-incident
```

**Rollback Steps:**
1. Stop accepting new traffic
2. Switch traffic back to blue deployment
3. Investigate issue
4. Document findings
5. Restore audit logs if needed
6. Notify stakeholders

---

## Post-Deployment Tasks

### 1. Security Hardening Review

- [ ] Verify all security headers correct
- [ ] Confirm rate limits appropriate for real traffic
- [ ] Validate encryption key rotation schedule
- [ ] Review audit logs for anomalies
- [ ] Check for false positive alerts

### 2. Team Documentation

- [ ] Security incident response runbook updated
- [ ] On-call procedures documented
- [ ] Alert escalation paths clear
- [ ] Team training completed
- [ ] Emergency contacts updated

### 3. Compliance Documentation

- [ ] GDPR compliance report generated
- [ ] Data processing agreement reviewed
- [ ] Retention policies implemented
- [ ] Privacy policy updated (if needed)
- [ ] Audit trail preserved

### 4. Continuous Monitoring

```bash
# Weekly security review
npm run review:security:weekly

# Monthly penetration testing
npm run pentest:monthly

# Quarterly compliance audit
npm run audit:compliance:quarterly

# Annual security assessment
npm run assess:security:annual
```

---

## Security Incident Response

### During Production Issue

**If Security Breach Suspected:**

1. **Immediate Actions** (0-5 minutes)
   - [ ] Alert security team
   - [ ] Enable incident response mode
   - [ ] Begin audit log preservation
   - [ ] Start incident clock

2. **Investigation** (5-30 minutes)
   - [ ] Analyze audit logs
   - [ ] Check error tracking
   - [ ] Review access logs
   - [ ] Determine scope

3. **Containment** (30-60 minutes)
   - [ ] Isolate affected systems if needed
   - [ ] Rotate compromised credentials
   - [ ] Implement WAF rules if needed
   - [ ] Notify affected users

4. **Eradication** (60+ minutes)
   - [ ] Patch vulnerability
   - [ ] Deploy fix to production
   - [ ] Re-enable services
   - [ ] Verify security

5. **Recovery & Post-Incident**
   - [ ] Restore normal monitoring
   - [ ] Communicate status to users
   - [ ] Preserve evidence for analysis
   - [ ] Conduct post-mortem

---

## Deployment Sign-Off

**Security Review Completed By**: ____________  
**Date**: ____________  
**Signature**: ____________

**Senior Security Officer Sign-Off**: ____________  
**Date**: ____________  
**Signature**: ____________

**Operations Team Sign-Off**: ____________  
**Date**: ____________  
**Signature**: ____________

---

## Reference Links

- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) - Security infrastructure details
- [PRODUCTION_MONITORING.md](./PRODUCTION_MONITORING.md) - Monitoring procedures
- [.github/workflows/security-scan.yml](./.github/workflows/security-scan.yml) - Automated security scanning
- [INCIDENT_RESPONSE.md](./docs/INCIDENT_RESPONSE.md) - Detailed incident procedures
