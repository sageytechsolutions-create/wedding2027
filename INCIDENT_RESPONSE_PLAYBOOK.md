# Incident Response Playbook - Phase 7 Sprint 3

**Status**: ✅ Complete incident response procedures  
**Date**: 2026-09-02  
**Purpose**: Quick reference for production incident response

---

## Table of Contents

1. [Incident Classification](#incident-classification)
2. [Response Procedures](#response-procedures)
3. [Common Incidents](#common-incidents)
4. [Escalation & Communication](#escalation--communication)
5. [Post-Incident Review](#post-incident-review)

---

## Incident Classification

### Severity Levels

**CRITICAL (P1) - Respond Immediately**
- System completely unavailable
- Data loss or corruption
- Security breach detected
- > 50% users affected
- Revenue impact

**HIGH (P2) - Respond Within 15 Minutes**
- Significant functionality broken
- 10-50% users affected
- Workaround unavailable
- Performance severe degradation

**MEDIUM (P3) - Respond Within 1 Hour**
- Some features degraded
- < 10% users affected
- Workaround available
- Minor performance issues

**LOW (P4) - Scheduled Response**
- Cosmetic issues
- Non-critical functionality affected
- No user impact
- Can be batched

---

## Response Procedures

### Step 1: Immediate Triage (< 2 minutes)

**Declare Incident Status**
```
#incidents Slack:
🚨 [SEVERITY] Incident Declared
- Issue: [Brief description]
- Detected: [Time]
- Affected: [Services/Users]
- Initial Assessment: [Root cause hypothesis]
- Response Lead: [Name]
- Status Page: Investigating
```

**Identify Incident Type**
```
☐ Deployment issue (green environment problem)
☐ Database issue (connection/corruption)
☐ Performance issue (latency/throughput)
☐ Security issue (breach/attack)
☐ Infrastructure issue (server/network)
☐ Third-party service (external API down)
☐ Unknown (requires investigation)
```

**Assess Severity**
```
☐ P1: System down, apply emergency procedure
☐ P2/P3: Follow incident-specific procedure
☐ P4: Schedule for next working day
```

### Step 2: Communication (< 5 minutes)

**Notify Stakeholders**
```
Slack:
  - #incidents: Incident details
  - @on-call-engineer: Page if P1/P2
  - Product Lead: Scope of impact

Email:
  - Support team: User response template
  - Customers: If applicable

Status Page:
  - Update: "Investigating issue..."
  - Notify subscribers
```

**Assign Incident Commander**
```
Role: Incident Commander
Responsibilities:
- Coordinate response team
- Make go/no-go decisions
- Communicate with stakeholders
- Track incident timeline

Duration: Until resolved + postmortem
```

### Step 3: Investigation

**Collect Initial Data (< 5 minutes)**
```bash
# Automated health check
curl https://ai-realestate.com/health
curl https://api.ai-realestate.com/health

# Check active environment
docker exec nginx-lb grep "set \$active_env" /etc/nginx/conf.d/active_env.conf

# View recent logs
docker logs backend-green -n 100 --timestamps
docker logs backend-blue -n 100 --timestamps

# Check metrics (Prometheus)
curl 'http://prometheus:9090/api/v1/query?query=up'
curl 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[5m])'

# Check database
docker exec backend-green psql -U postgres -d wedding2027_prod -c "SELECT 1;"
```

**Follow Incident-Specific Procedure**
- See [Common Incidents](#common-incidents) section below

### Step 4: Resolution

**Implement Fix**
- Follow incident-specific steps
- Test in green environment if deploying
- Have rollback plan ready

**Verify Resolution**
- Health checks passing
- Metrics normal
- User reports resolved
- No error spikes

**Update Status**
```
Slack: ✅ Incident resolved - [Brief summary of fix]
Status Page: "Resolved"
```

### Step 5: Post-Incident

**Within 1 Hour:**
- Document incident timeline
- Capture error logs
- Record resolution steps
- Note prevention measures

**Within 24 Hours:**
- Schedule postmortem
- Identify root cause
- Plan preventive measures
- Update runbooks

---

## Common Incidents

### 1. 🔴 Backend Service Down

**Detection**
```
Alert: Service Down (backend = 0)
Symptom: 502 Bad Gateway from nginx
Timeline: Deployment just completed
```

**Quick Assessment**
```bash
# Is green running?
docker compose -f docker-compose.production.yml ps backend-green
# Status should be: Up

# Is it healthy?
curl http://localhost:3002/health
# Expected: 200 OK

# What are the logs saying?
docker logs backend-green --tail 50
```

**Resolution Decision Tree**

```
Is backend-green running?
├─ YES
│  └─ Check logs for errors
│     ├─ Startup error
│     │  └─ Investigate error
│     │     ├─ Fix in code
│     │     └─ Redeploy
│     │
│     └─ Runtime error
│        └─ Check environment variables
│           ├─ Missing var?
│           │  └─ Set and restart
│           └─ Wrong database?
│              └─ Verify DATABASE_URL
│
└─ NO (not running)
   └─ Check container logs
      ├─ Exit code analysis
      │  ├─ Exit 127: Not found
      │  ├─ Exit 1: Runtime error
      │  └─ Check logs
      │
      └─ Restart container
         docker compose up -d backend-green
```

**Emergency Rollback (if P1)**
```bash
# Switch back to blue immediately
docker exec nginx-lb \
  /bin/sh -c 'echo "set \$active_env blue;" > /etc/nginx/conf.d/active_env.conf && nginx -s reload'

# Verify blue is responding
curl https://ai-realestate.com/health

# Announce to team
# "🔄 Rolled back to blue environment - Green deployment had issues"
```

**Prevention**
- ✅ Run smoke tests before traffic switch
- ✅ Monitor error logs during first 5 minutes
- ✅ Keep blue running for instant rollback

---

### 2. 🟠 High Error Rate

**Detection**
```
Alert: HighErrorRate triggered
Symptom: 5xx errors in response logs
Error Rate: > 5%
Timeline: Started ~5 minutes ago
```

**Investigation**
```bash
# Get exact error rate
curl 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[1m])'

# See recent errors
docker logs backend-green | grep -i error | tail -20

# Check error types
docker logs backend-green | grep "status=5" | head -10

# Check Sentry for grouped errors
# Visit: sentry.io/projects/.../issues/
```

**Common Causes & Fixes**

**Cause: Database Connection Error**
```bash
# Check database is up
docker exec postgres-prod pg_isready
# Expected: accepting connections

# Test connection
docker exec backend-green psql -U postgres -d wedding2027_prod -c "SELECT 1;"

# If down, restart database
docker restart postgres-prod
docker compose up -d postgres

# If connection pool exhausted
docker logs backend-green | grep "too many connections"
# Solution: Restart affected backend container
docker restart backend-green
```

**Cause: OOM (Out of Memory)**
```bash
# Check memory usage
docker stats --no-stream

# If > 500MB per service
docker update --memory 512m backend-blue backend-green

# Restart service
docker restart backend-green

# Monitor for recurrence
watch -n 5 'docker stats --no-stream | grep backend'
```

**Cause: Slow External API**
```bash
# Check external service status
curl https://external-api.example.com/health

# If slow, increase timeouts or use fallback
# Update code and redeploy

# Temporary: Alert users about slowness
# "Experiencing slower response times due to external service"
```

**Resolution Confirmation**
```bash
# Wait 5 minutes
sleep 300

# Check error rate is back to < 0.1%
curl 'http://prometheus:9090/api/v1/query?query=rate(http_errors_total[5m])'

# Check user reports
# (Slack #support or monitoring dashboard)
```

---

### 3. 🟠 High Latency (Slow Response Times)

**Detection**
```
Alert: SlowResponseTime triggered
Symptom: Response time p95 > 500ms (target: < 200ms)
Timeline: Degradation started ~10 minutes ago
```

**Quick Diagnosis**
```bash
# Current latency
curl 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'

# Which endpoint is slow?
docker logs backend-green | grep "duration=" | sort -t= -k3 -rn | head -10

# Is it database?
docker logs backend-green | grep "db query" | grep "duration=" | sort -t= -k3 -rn | head -10
```

**Common Causes & Fixes**

**Cause: Slow Database Queries**
```bash
# Find slow queries
docker exec postgres-prod psql -U postgres -d wedding2027_prod \
  -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check query plan
docker exec postgres-prod psql -U postgres -d wedding2027_prod \
  -c "EXPLAIN ANALYZE SELECT * FROM [slow_query];"

# Add missing index if needed
# Update schema and redeploy

# Immediate workaround: Clear query cache
docker exec backend-green redis-cli FLUSHDB ASYNC
```

**Cause: High Traffic**
```bash
# Check request rate
curl 'http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total[5m]))'

# If > expected baseline:
# Option 1: Scale horizontally (add more backend instances)
# Option 2: Implement rate limiting
# Option 3: Alert users about capacity

# Temporary rate limit
docker exec nginx-lb \
  /bin/sh -c 'echo "limit_req_zone \$binary_remote_addr zone=api:10m rate=5r/s;" > /etc/nginx/conf.d/rate-limit.conf && nginx -s reload'
```

**Cause: Resource Constraints**
```bash
# Check CPU/memory
docker stats --no-stream

# If high CPU
# - Profile to find hot code paths
# - Optimize or add caching
# - Scale horizontally

# If high memory
# - Check for memory leaks
# - Restart container as immediate fix
# - Investigate memory usage trend

docker restart backend-green
```

**Temporary Workaround**
```bash
# While investigating, implement caching
docker exec redis-prod redis-cli CONFIG SET maxmemory-policy allkeys-lru
docker exec redis-prod redis-cli CONFIG SET maxmemory 256mb

# Monitor improvement
watch -n 5 'curl -s "http://prometheus:9090/api/v1/query?query=http_request_duration_seconds" | jq .'
```

---

### 4. 🔴 Database Connection Error

**Detection**
```
Alert: Database unavailable
Error: "connection refused" or "too many connections"
Symptom: All backend services returning 5xx
```

**Immediate Check**
```bash
# Is postgres running?
docker ps | grep postgres

# Is it accepting connections?
docker exec postgres-prod pg_isready -U postgres

# How many active connections?
docker exec postgres-prod psql -U postgres -c "SELECT count(*) as active_connections FROM pg_stat_activity;"
```

**Resolution**

**If Postgres is Down**
```bash
# Restart postgres
docker restart postgres-prod

# Monitor startup
docker logs postgres-prod -f --since 30s

# Expected: "database system is ready to accept connections"

# Verify connection works
docker exec postgres-prod psql -U postgres -c "SELECT 1;"

# Restart backends if needed
docker restart backend-blue backend-green
```

**If Too Many Connections**
```bash
# Check who's connected
docker exec postgres-prod psql -U postgres \
  -c "SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;"

# Kill idle connections
docker exec postgres-prod psql -U postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle';"

# Increase connection limit if needed
docker exec postgres-prod psql -U postgres \
  -c "ALTER SYSTEM SET max_connections = 250;"

docker restart postgres-prod
```

**Verify Resolution**
```bash
# Test connection
docker exec backend-green psql -U postgres -d wedding2027_prod -c "SELECT 1;"

# Restart backend services
docker restart backend-green backend-blue

# Verify health endpoint
curl http://localhost:3002/health
```

---

### 5. 🟡 Redis Cache Issues

**Detection**
```
Error: "ERRORIN response from redis"
Performance: Cache hit rate drops below 70%
Memory: Redis consuming > 500MB
```

**Investigation**
```bash
# Is redis running?
docker exec redis-prod redis-cli ping
# Expected: PONG

# Check memory usage
docker exec redis-prod redis-cli info memory
# Check: used_memory_human, evicted_keys

# Check operations
docker exec redis-prod redis-cli info stats
```

**Common Issues & Fixes**

**Issue: Redis Out of Memory**
```bash
# Current memory
docker exec redis-prod redis-cli info memory | grep used_memory_human

# If > 500MB:
# Option 1: Increase max memory
docker exec redis-prod redis-cli CONFIG SET maxmemory 1gb

# Option 2: Clear cache
docker exec redis-prod redis-cli FLUSHDB ASYNC

# Option 3: Change eviction policy
docker exec redis-prod redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Permanent fix: Update docker-compose
# docker-compose.production.yml → redis environment: REDIS_MAX_MEMORY=512mb
```

**Issue: Cache Not Working**
```bash
# Check if redis is actually storing data
docker exec redis-prod redis-cli DBSIZE
# If returns 0 keys, cache is not being used

# Verify backend is configured to use redis
docker exec backend-green grep -i redis /etc/environment
# Should show: REDIS_HOST=redis-prod, REDIS_PORT=6379

# Test redis connection from backend
docker exec backend-green redis-cli -h redis-prod ping
```

**Issue: High CPU on Redis**
```bash
# Check blocking operations
docker exec redis-prod redis-cli info commandstats | head -20

# If SCAN operations high, reduce concurrent clients
# Or optimize data structures

# Temporary: Restart redis
docker restart redis-prod

# Monitor CPU
watch -n 5 'docker stats redis-prod --no-stream'
```

---

### 6. 🔴 Security Incident - Potential Attack

**Detection**
```
Alert: Abnormal traffic pattern
- Rate: 1000s of requests from single IP
- Error 403 responses
- SQL injection patterns detected
- DDoS indicators
```

**Immediate Actions**
```bash
# Declare security incident
# Post to #security channel: 🔒 Security Incident Declared

# Block offending IP in nginx
docker exec nginx-lb \
  /bin/sh -c 'echo "deny [ATTACKER_IP];" >> /etc/nginx/conf.d/blocked-ips.conf && nginx -s reload'

# Enable rate limiting
docker exec nginx-lb \
  /bin/sh -c 'echo "limit_req_zone \$binary_remote_addr zone=strict:10m rate=1r/s;" >> /etc/nginx/conf.d/rate-limit.conf && nginx -s reload'

# Check logs for breach indicators
docker logs backend-green | grep -i "sql\|injection\|xss"

# Review Sentry for suspicious activity
# Visit: sentry.io → Issu → Security
```

**Investigation**
```bash
# Analyze attack logs
docker logs nginx-lb | grep -i "deny\|403" | head -50

# Get attacker IPs
docker logs nginx-lb | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# Check if any data was compromised
# (Check audit logs, compare database integrity)
```

**Response**
```
1. Contain: Block attacker IPs
2. Investigate: Determine scope of attack
3. Remediate: Apply security patches
4. Restore: If needed, restore from clean backup
5. Notify: Inform affected customers
6. Review: Post-incident security audit
```

---

## Escalation & Communication

### Escalation Path (P1/P2 Incidents)

```
Incident Detected (0 min)
    ↓
On-Call Engineer Paged (2 min)
    ↓
Incident Commander Takes Charge (5 min)
    ↓
If > 15 min unresolved: Page Engineering Lead
    ↓
If > 30 min unresolved: Page VP Engineering
    ↓
If customer-facing: Page Customer Success Lead
```

### Communication Template

**Initial Alert (< 5 minutes)**
```
#incidents

🚨 [P1/P2] Incident Alert

Title: [Brief issue description]
Started: [HH:MM UTC]
Severity: [P1 - System Down | P2 - Degraded]
Affected Services: [backend | frontend | database | all]
Impact: [%users affected, estimated]
Status: INVESTIGATING

Response Lead: @[name]
ETA to Update: 5 minutes
```

**Status Updates (Every 15 minutes if ongoing)**
```
Update: [10:30 UTC]
Status: INVESTIGATING → [MITIGATING | MONITORING | ESCALATING]
Finding: [What we discovered]
Action: [What we're doing]
ETA to Resolution: [estimate]
```

**Resolution (Upon fix)**
```
✅ RESOLVED [HH:MM UTC]

Root Cause: [Brief explanation]
Fix Applied: [What we did]
Duration: [Total time affected]
Follow-up: [Postmortem date]
```

---

## Post-Incident Review

### Incident Report Template

```markdown
# Incident Report - [Date] [Issue Name]

## Timeline
- HH:MM: Issue detected (alert or user report)
- HH:MM: Incident declared, team assembled
- HH:MM: Root cause identified
- HH:MM: Fix applied
- HH:MM: Verified resolved
- HH:MM: All-clear given

## Impact
- Duration: X minutes
- Users Affected: X%
- Revenue Impact: $X
- Severity: P1/P2/P3

## Root Cause
[What actually caused the issue - not symptoms]

## Timeline of Events
1. [What happened step by step]
2. [Contributing factors]
3. [How it escalated]
4. [What stopped it]

## Contributing Factors
- [Factor 1]: [Why this contributed]
- [Factor 2]: [Why this contributed]

## What Went Well
- [Positive aspect 1]
- [Positive aspect 2]

## What We'll Improve
1. [Action Item]: Assigned to [Owner], Due [Date]
2. [Action Item]: Assigned to [Owner], Due [Date]
3. [Action Item]: Assigned to [Owner], Due [Date]

## Lessons Learned
- [Key learning 1]
- [Key learning 2]
```

### Postmortem Meeting

**Within 24 hours of incident:**
- Review incident report
- Discuss root cause (not blame)
- Identify preventive measures
- Assign action items
- Set follow-up date (2 weeks)

**Action Item Tracking**
```
Item: "Add health check for redis connection"
Owner: [Name]
Due: [Date - within 2 weeks]
Priority: High
Status: In Progress → Complete

Item: "Implement automated failover for database"
Owner: [Name]
Due: [Date - within 1 month]
Priority: Medium
Status: Backlog
```

---

## Reference: Quick Commands

```bash
# Check all services
docker compose ps

# View logs (real-time)
docker logs -f [service-name]

# Switch to green environment
docker exec nginx-lb /bin/sh -c 'echo "set \$active_env green;" > /etc/nginx/conf.d/active_env.conf && nginx -s reload'

# Switch to blue environment (rollback)
docker exec nginx-lb /bin/sh -c 'echo "set \$active_env blue;" > /etc/nginx/conf.d/active_env.conf && nginx -s reload'

# Check metrics
curl 'http://prometheus:9090/api/v1/query?query=up'

# Check errors
docker logs backend-green | grep -i error

# Restart service
docker restart [service-name]

# Scale services
docker-compose up -d --scale backend=2

# View resource usage
docker stats --no-stream
```

---

**Status**: 🟢 Incident Response Ready  
**Last Updated**: 2026-09-02  
**Next Review**: 2026-12-02

