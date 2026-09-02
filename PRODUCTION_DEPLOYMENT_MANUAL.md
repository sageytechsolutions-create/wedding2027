# Production Deployment Manual - Phase 7 Sprint 3

**Status**: ✅ Ready for production deployment  
**Date**: 2026-09-02  
**Branch**: `claude/ai-investment-realestate-intpuu`  
**Deployment Strategy**: Blue-Green with zero-downtime switching

---

## Executive Summary

This manual guides the deployment of Phase 7 Sprint 3 to production using blue-green deployment strategy, enabling zero-downtime updates with instant rollback capability.

**Key Points:**
- Zero-downtime deployment in < 5 minutes
- Both environments running simultaneously during switch
- Instant rollback if issues detected
- Automated health checks and smoke tests
- Complete monitoring and alerting setup

---

## Pre-Production Requirements

### Infrastructure Checklist

```
☐ Production servers provisioned (separate from staging)
☐ PostgreSQL database cluster set up with backups
☐ Redis cluster configured for high availability
☐ SSL/TLS certificates installed (ai-realestate.com)
☐ Nginx load balancer configured
☐ Monitoring stack deployed (Prometheus, Grafana, Jaeger)
☐ Alerting configured (PagerDuty/AlertManager)
☐ Disaster recovery plan reviewed and tested
☐ Incident response team assigned
☐ Communication channels ready (Slack, status page)
```

### Environment Variables

**Required - Generate Before Deployment:**

```bash
# Security - GENERATE NEW
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Database - Production Instance
DATABASE_URL=postgresql://prod_user:secure_password@prod-postgres:5432/wedding2027_prod
DB_USER=prod_user
DB_PASSWORD=secure_password
DB_NAME=wedding2027_prod

# Redis - Production Cluster
REDIS_HOST=prod-redis-01.internal
REDIS_PORT=6379

# Sentry - Production DSN
SENTRY_DSN=https://your-prod-key@sentry.io/prod-project-id
SENTRY_TRACES_SAMPLE_RATE=0.05

# Supabase - Production Project
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_KEY=prod-anon-key

# SMTP - Production Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=production-email@company.com
SMTP_PASSWORD=production-app-password

# API Configuration
NODE_ENV=production
PORT=3000
VITE_API_BASE_URL=https://api.ai-realestate.com
VITE_SENTRY_DSN=prod-sentry-key
```

---

## Blue-Green Deployment Architecture

### Current State (Blue Environment)

```
┌─────────────────────────────────────────┐
│         Production Load Balancer        │
│            (Nginx + SSL/TLS)            │
└────────────────────┬────────────────────┘
                     │ All Traffic
                     ▼
        ┌────────────────────────┐
        │   BLUE ENVIRONMENT     │
        │   (Current Production) │
        ├────────────────────────┤
        │ backend-blue:3000      │
        │ frontend-blue:3000     │
        │ PostgreSQL (shared)    │
        │ Redis (shared)         │
        └────────────────────────┘
```

### New State (During Deployment)

```
┌─────────────────────────────────────────┐
│         Production Load Balancer        │
│            (Nginx + SSL/TLS)            │
└────────────────────┬────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │ Health Checks
         ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  BLUE ENVIRONMENT│   │ GREEN ENVIRONMENT│
│   (Standby)      │   │  (New Version)   │
├──────────────────┤   ├──────────────────┤
│ backend-blue     │   │ backend-green    │
│ frontend-blue    │   │ frontend-green   │
│                  │   │ PostgreSQL (shd) │
│                  │   │ Redis (shared)   │
└──────────────────┘   └──────────────────┘
```

### Final State (After Switch)

```
┌─────────────────────────────────────────┐
│         Production Load Balancer        │
│            (Nginx + SSL/TLS)            │
└────────────────────┬────────────────────┘
                     │ All Traffic
                     ▼
        ┌────────────────────────┐
        │  GREEN ENVIRONMENT     │
        │  (New Production)      │
        ├────────────────────────┤
        │ backend-green:3000     │
        │ frontend-green:3000    │
        │ PostgreSQL (shared)    │
        │ Redis (shared)         │
        └────────────────────────┘
        
        BLUE environment still running
        for instant rollback capability
```

---

## Step-by-Step Production Deployment

### Phase 1: Pre-Deployment Validation (15 minutes)

**Step 1.1: Staging Verification**

```bash
# Verify staging deployment is stable
curl -f https://staging.ai-realestate.com/health

# Check staging metrics for past 24 hours
# - Error rate < 0.1%
# - Response time p95 < 200ms
# - Uptime 100%
# - No critical alerts

# Verify no staging issues in past 24 hours
# (Check Slack #incidents, Sentry, etc.)
```

**Step 1.2: Production Database Backup**

```bash
# Create pre-deployment backup
ssh prod-db-server
pg_dump -U prod_user -d wedding2027_prod | \
  gzip > /backups/production_pre_deployment_$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup
ls -lh /backups/production_pre_deployment*.sql.gz

# Verify backup integrity
gunzip -t /backups/production_pre_deployment*.sql.gz
# Should return success (exit code 0)
```

**Step 1.3: Team Notification**

```bash
# Post to #deployments Slack channel
Message:
---
🚀 PRODUCTION DEPLOYMENT STARTING

Timeline:
- 14:00 UTC: Pre-deployment checks
- 14:30 UTC: Green environment startup
- 14:40 UTC: Health checks
- 14:45 UTC: Traffic switch
- 15:00 UTC: Post-deployment validation
- 15:15 UTC: Status update

Team assigned:
- Deploy Lead: [Name]
- On-Call Support: [Name]
- Communications: [Name]

Status Page: https://status.ai-realestate.com
Incident Channel: #incidents
---
```

### Phase 2: Green Environment Startup (10 minutes)

**Step 2.1: Pull Latest Production Images**

```bash
# SSH to production server
ssh prod-deploy-server

# Set environment
cd /opt/production
export $(cat .env.production | grep -v '#' | xargs)

# Pull latest images from registry
docker compose -f docker-compose.production.yml --profile green pull

# Expected output
backend-green: pulling...
frontend-green: pulling...
# (images should be tagged with current git SHA)
```

**Step 2.2: Start Green Environment**

```bash
# Start green services (blue stays running)
docker compose -f docker-compose.production.yml \
  --profile green up -d backend-green frontend-green

# Watch startup logs
docker compose -f docker-compose.production.yml \
  --profile green logs -f

# Expected sequence:
# 1. backend-green: starting...
# 2. frontend-green: starting...
# 3. (wait 20-30 seconds for full startup)
# 4. backend-green: Server listening on port 3000
# 5. frontend-green: ready
```

### Phase 3: Health Verification (8 minutes)

**Step 3.1: Backend Health Checks**

```bash
# Wait for container to be ready
sleep 30

# Direct health check
echo "Testing backend-green on port 3002..."
for i in {1..10}; do
  if curl -f http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ Backend health OK"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ Backend health check failed after 100 seconds"
    exit 1
  fi
  echo "  Attempt $i/10..."
  sleep 10
done
```

**Step 3.2: Frontend Health Checks**

```bash
# Direct health check
echo "Testing frontend-green on port 3004..."
for i in {1..10}; do
  if curl -f http://localhost:3004/ > /dev/null 2>&1; then
    echo "✅ Frontend loaded"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ Frontend health check failed after 100 seconds"
    exit 1
  fi
  echo "  Attempt $i/10..."
  sleep 10
done
```

**Step 3.3: Database Connectivity Test**

```bash
# Test from green backend container
docker exec backend-green \
  curl -f http://localhost:3000/api/health

# Expected response: 200 OK
# { "status": "ok", "database": "connected" }
```

**Step 3.4: Load Balancer Validation**

```bash
# Verify nginx config is valid
docker exec nginx-lb nginx -t
# Expected: syntax is ok, test is successful

# Show current active backend
docker exec nginx-lb nginx -T | grep -A5 'upstream backend'
# Should show: backend_blue currently active
```

### Phase 4: Smoke Tests (5 minutes)

**Step 4.1: Production Smoke Tests**

```bash
# Create comprehensive smoke test suite
cat > /tmp/prod-smoke-tests.sh << 'TESTS'
#!/bin/bash

BACKEND_URL="http://localhost:3002"
FRONTEND_URL="http://localhost:3004"
EXIT_CODE=0

echo "🧪 Running Production Smoke Tests on GREEN environment..."
echo ""

# Test 1: Health endpoint
echo "[1/5] Testing health endpoint..."
if curl -f "$BACKEND_URL/health" > /dev/null 2>&1; then
  echo "✅ Health endpoint OK"
else
  echo "❌ Health endpoint FAILED"
  EXIT_CODE=1
fi

# Test 2: API connectivity
echo "[2/5] Testing API connectivity..."
if curl -f "$BACKEND_URL/api/health" > /dev/null 2>&1; then
  echo "✅ API endpoint OK"
else
  echo "❌ API endpoint FAILED"
  EXIT_CODE=1
fi

# Test 3: Frontend loads
echo "[3/5] Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "✅ Frontend OK ($FRONTEND_STATUS)"
else
  echo "❌ Frontend FAILED (status: $FRONTEND_STATUS)"
  EXIT_CODE=1
fi

# Test 4: Database query
echo "[4/5] Testing database..."
DB_TEST=$(docker exec backend-green \
  psql -U postgres -d wedding2027_prod \
  -c "SELECT 1;" 2>&1 || echo "FAIL")
if [[ $DB_TEST == *"1 row"* ]]; then
  echo "✅ Database OK"
else
  echo "❌ Database FAILED"
  EXIT_CODE=1
fi

# Test 5: Response time
echo "[5/5] Testing response time..."
RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s "$BACKEND_URL/health")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)
if [ $RESPONSE_MS -lt 500 ]; then
  echo "✅ Response time OK (${RESPONSE_MS}ms)"
else
  echo "⚠️  Response time elevated (${RESPONSE_MS}ms)"
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All smoke tests PASSED"
else
  echo "❌ Some smoke tests FAILED"
fi

exit $EXIT_CODE
TESTS

chmod +x /tmp/prod-smoke-tests.sh
/tmp/prod-smoke-tests.sh
```

**Step 4.2: Functional Tests**

```bash
# Sample API calls to verify functionality
echo "Testing sample API endpoints on GREEN..."

# Test 1: Property endpoint
curl -X GET http://localhost:3002/api/properties?limit=5

# Test 2: Portfolio calculation
curl -X POST http://localhost:3002/api/portfolio/calculate \
  -H "Content-Type: application/json" \
  -d '{"properties": []}'

# Test 3: Market data
curl -X GET http://localhost:3002/api/market/trends

# All should return 200 with valid JSON responses
```

### Phase 5: Traffic Switch (2 minutes)

**Step 5.1: Switch Decision**

```bash
# CRITICAL: Verify all tests passed before proceeding
# Checklist:
# ☐ Backend health: PASS
# ☐ Frontend health: PASS
# ☐ Database connected: PASS
# ☐ Smoke tests: PASS
# ☐ Response time: ACCEPTABLE
# ☐ Error logs: CLEAN
# ☐ Team ready: YES

# Only proceed if all PASS
# If any FAIL, execute ROLLBACK (see Phase 6)
```

**Step 5.2: Execute Traffic Switch**

```bash
# Switch nginx upstream to GREEN
echo "Switching traffic from BLUE to GREEN..."

# Edit nginx config or use environment variable
# Method 1: Modify upstream (if using env variable)
docker exec nginx-lb \
  /bin/sh -c 'echo "set \$active_env green;" > /etc/nginx/conf.d/active_env.conf'

# Method 2: Nginx reload (uses new config)
docker exec nginx-lb nginx -s reload

# Verify switch
sleep 5

# Test that traffic now goes to green
curl -v https://ai-realestate.com/health
# Response headers should show: backend-green responding
```

**Step 5.3: Verify Traffic Switch**

```bash
# Monitor which backend is serving requests
docker logs backend-green -f --since 30s &
BLUE_PID=$!

# Make test requests to public endpoint
for i in {1..5}; do
  curl https://ai-realestate.com/api/health
  sleep 1
done

# Check backend logs
# Should see request logs in backend-green only
# backend-blue logs should be quiet

kill $BLUE_PID 2>/dev/null
```

### Phase 6: Post-Deployment Validation (10 minutes)

**Step 6.1: Monitor Error Rates**

```bash
# Watch error rate on new environment (first 5 minutes)
for minute in {1..5}; do
  ERROR_RATE=$(curl -s http://localhost:9090/api/v1/query \
    --data-urlencode 'query=increase(http_errors_total[1m])' | \
    jq '.data.result[0].value[1]' 2>/dev/null || echo "0")
  
  echo "Minute $minute: Error rate = $ERROR_RATE/min"
  
  # Alert if error rate > 1% of requests
  if (( $(echo "$ERROR_RATE > 10" | bc -l) )); then
    echo "⚠️  High error rate detected - INVESTIGATE"
  fi
  
  sleep 60
done
```

**Step 6.2: Check Response Times**

```bash
# Monitor p95 latency (target: < 200ms)
curl -s http://localhost:9090/api/v1/query \
  --data-urlencode 'query=http_request_duration_seconds{quantile="0.95"}' | \
  jq '.data.result[].value[1]'

# Expected: value between 50-200
# If > 500ms: investigate database performance
```

**Step 6.3: Database Connection Check**

```bash
# Verify database is healthy
docker exec backend-green \
  psql -U postgres -d wedding2027_prod \
  -c "SELECT version(); SELECT count(*) FROM information_schema.tables;"

# Check connection count
docker exec postgres-prod \
  psql -U postgres -c "SELECT count(*) as active_connections FROM pg_stat_activity;"

# Expected: < 100 active connections
# If > 150: may indicate connection pool issue
```

**Step 6.4: Cache Verification**

```bash
# Check Redis is working
docker exec redis-prod redis-cli info stats

# Expected metrics:
# - total_commands_processed: increasing
# - evicted_keys: should be 0
# - expired_keys: normal
```

### Phase 7: Final Verification (5 minutes)

**Step 7.1: User-Facing Verification**

```bash
# Test from external client
echo "Testing from external network..."

# Frontend loads
curl -I https://ai-realestate.com/
# Expected: 200, Content-Type: text/html

# API responds
curl -I https://api.ai-realestate.com/health
# Expected: 200, Content-Type: application/json

# Test application functionality
curl https://api.ai-realestate.com/api/properties?limit=1 | jq .
```

**Step 7.2: Monitoring Dashboard Check**

```bash
# Open monitoring dashboards
# Grafana: https://monitoring.ai-realestate.com:3000
# Check dashboards:
# - Application Overview: All green
# - Error Rates: < 0.1%
# - Response Times: p95 < 200ms
# - Database: Healthy
# - Redis: Healthy
# - HTTP Traffic: Increasing to expected level
```

**Step 7.3: Status Page Update**

```bash
# Update status page
# Status: ✅ All Systems Operational (Upgraded)
# Post: "Production deployment of Phase 7 Sprint 3 completed"
# Include: Feature list, performance improvements

# Send completion notification
curl -X POST https://status.ai-realestate.com/api/incidents \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "message": "Production deployment completed successfully"
  }'
```

---

## Rollback Procedure (Execute if issues detected)

### Quick Rollback (< 1 minute)

**Immediate Action (if critical issue detected):**

```bash
# STOP: Do NOT make any other changes
# Execute rollback immediately

# Switch traffic back to BLUE
docker exec nginx-lb \
  /bin/sh -c 'echo "set \$active_env blue;" > /etc/nginx/conf.d/active_env.conf'

docker exec nginx-lb nginx -s reload

# Verify BLUE is active
curl https://ai-realestate.com/health
# Should respond from backend-blue

# Notify team
echo "⚠️  ROLLBACK EXECUTED - Traffic switched back to BLUE"
```

**Post-Rollback Actions:**

```bash
# 1. Stop GREEN services (keep for investigation)
docker compose -f docker-compose.production.yml --profile green down

# 2. Alert team
# Post to #incidents: "Rollback completed - investigating issue"

# 3. Capture logs for analysis
docker logs backend-green > /tmp/backend-green-error.log
docker logs frontend-green > /tmp/frontend-green-error.log

# 4. Run diagnostics
# - Check error logs
# - Review metrics during failed deployment
# - Identify root cause

# 5. Report findings
# - What went wrong
# - When it was detected
# - How it was fixed
# - Prevention measures
```

### Full Rollback (Database)

```bash
# Use only if database corruption suspected
# Otherwise, quick rollback is sufficient

# 1. Stop all services
docker compose -f docker-compose.production.yml down

# 2. Restore from backup
pg_restore -d wedding2027_prod /backups/production_pre_deployment*.sql.gz

# 3. Start BLUE services only
docker compose -f docker-compose.production.yml up -d \
  backend-blue frontend-blue postgres redis nginx-lb

# 4. Verify all services healthy
# (Follow Phase 3 and 7 verification steps)
```

---

## Monitoring After Deployment

### First Hour (Enhanced Monitoring)

**Every 5 minutes:**
- Check error rate (should be < 0.1%)
- Verify response time (p95 < 200ms)
- Monitor memory usage
- Check database connections

**Every 15 minutes:**
- Review application logs
- Check for any warnings
- Monitor user reports

**At 1 hour mark:**
- Declare production deployment "stable"
- Return to normal monitoring thresholds
- Post success notification

### Metrics to Monitor

```
CRITICAL ALERTS (Rollback Threshold)
- Error rate > 5% for 2+ minutes → ROLLBACK
- Response time > 2000ms p95 → ROLLBACK
- Database unavailable → ROLLBACK
- Out of memory events → ROLLBACK

WARNING ALERTS (Investigate)
- Error rate 1-5% → Check logs
- Response time 500-2000ms → Optimize
- Memory > 80% → Scale or investigate
- Database connections > 150 → Review
```

---

## Keeping Blue Environment After Successful Deployment

### Why Keep Blue Running?

1. **Instant Rollback**: Can switch back in < 10 seconds
2. **Comparison Testing**: Run A/B tests if needed
3. **Traffic Ramp-up**: Gradually shift traffic if needed

### Blue Environment Lifecycle

```
✅ Deployment completes
✅ GREEN takes all traffic
✅ BLUE keeps running (standby) for 24 hours
   (This is the "Keep-Alive" period)

After 24 hours (if no issues):
→ Stop BLUE services
→ Archive logs for 30 days
→ Prepare BLUE for next deployment

If issues detected within 24 hours:
→ Rollback to BLUE immediately
→ Keep BLUE running while investigating
```

---

## Post-Deployment Activities

### Day 1 (Deployment Day)

```
✅ 00:00 - Deployment starts
✅ 00:30 - Production live on GREEN
✅ 01:00 - Declare deployment successful
✅ 06:00 - Daily standup: deployment review
✅ 12:00 - 12-hour stability check
✅ 22:00 - End-of-day status: all stable

Keep BLUE running for rollback capability
```

### Day 2 (Validation Day)

```
✅ Morning: Review all metrics
✅ Verify: No customer reports
✅ Performance: Baseline comparison
✅ Decision: Keep GREEN, retire BLUE
  docker compose -f docker-compose.production.yml \
    --profile green down  (Only stop if confident)
```

### Week 1 (Stability Week)

```
Daily:
- Review error logs
- Check performance trends
- Monitor resource usage
- Collect user feedback

By end of week:
- Performance baseline established
- No critical issues
- Deployment deemed successful
- Prepare for next release
```

---

## Incident Response During Deployment

### If Issues Are Detected

**Severity: CRITICAL**
- Response time: Execute rollback immediately
- Error rate > 5%: Execute rollback immediately
- Database down: Execute rollback immediately
- OOM events: Execute rollback immediately

**Severity: HIGH**
- Error rate 1-5%: Investigate (2 min), decide rollback
- Response time 500-2s: Investigate (3 min), decide rollback
- Memory > 80%: Optimize or rollback

**Severity: MEDIUM**
- Elevated latency: Optimize
- Cache misses: Investigate
- Log warnings: Review

### Communication Protocol

```
WHEN ISSUE DETECTED:

Slack (immediate):
> Alert: Error rate elevated on production
> Investigating...

After 2 minutes:
> Status: [Investigating | Optimizing | Rolling back]

After 5 minutes:
> Status update: [Resolution | More time needed]

Post-resolution:
> Issue resolved. Root cause: [...]
> Postmortem scheduled: [Date/Time]
```

---

## Checklist - Before Deploying to Production

```
PRE-DEPLOYMENT APPROVAL
☐ PR #2 reviewed and approved by team lead
☐ All tests passing in CI/CD
☐ Staging deployment stable for 24+ hours
☐ No critical issues in staging
☐ Product manager approved
☐ Security review completed
☐ Database migration tested
☐ Backup procedure verified
☐ Incident response team on standby

INFRASTRUCTURE READINESS
☐ Production servers healthy
☐ Database backups current
☐ SSL certificates valid (30+ days)
☐ Monitoring dashboards active
☐ Alerting configured and tested
☐ Load balancer configured
☐ All environment variables set

TEAM READINESS
☐ On-call engineer assigned
☐ Incident commander ready
☐ Communication leads briefed
☐ Customer support notified
☐ Status page team ready
☐ Rollback procedure reviewed
☐ Team channels monitored

GO/NO-GO DECISION
☐ Green light from: Tech Lead
☐ Green light from: Product Manager
☐ Green light from: DevOps Lead
☐ Formal approval recorded with timestamp
```

---

## Support & Escalation

### During Deployment

**Issue Detected:**
1. Immediate: Notify #incidents channel
2. Assess severity
3. Execute rollback if CRITICAL
4. Engage on-call if needed

**After Deployment:**
1. Postmortem within 24 hours
2. Document lessons learned
3. Update runbooks
4. Plan preventive measures

---

## Quick Reference - Key Commands

```bash
# Check current active environment
docker exec nginx-lb grep "set \$active_env" /etc/nginx/conf.d/active_env.conf

# Switch to GREEN
docker exec nginx-lb /bin/sh -c 'echo "set \$active_env green;" > /etc/nginx/conf.d/active_env.conf && nginx -s reload'

# Switch to BLUE (rollback)
docker exec nginx-lb /bin/sh -c 'echo "set \$active_env blue;" > /etc/nginx/conf.d/active_env.conf && nginx -s reload'

# View backend logs (GREEN)
docker logs backend-green -f

# View frontend logs (GREEN)
docker logs frontend-green -f

# Stop GREEN services
docker compose -f docker-compose.production.yml --profile green down

# Stop BLUE services (only after confirmed stable)
docker compose -f docker-compose.production.yml --profile blue down

# Full restart (emergency only)
docker compose -f docker-compose.production.yml down -v
docker compose -f docker-compose.production.yml up -d
```

---

## Success Criteria

Production deployment is **SUCCESSFUL** when:

✅ All health checks pass  
✅ Error rate < 0.1% for 1+ hour  
✅ Response time p95 < 200ms  
✅ Database healthy and stable  
✅ No customer reports  
✅ Monitoring shows normal patterns  
✅ Incident response team can stand down  

---

**Status**: 🟢 Production Deployment Ready  
**Next Step**: Execute deployment following this manual  
**Support**: Contact DevOps team or consult PR #2 for discussion

