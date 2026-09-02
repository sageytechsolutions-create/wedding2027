# Load Testing Guide

## Overview

This guide provides procedures for conducting load testing on the Wedding Planning Platform staging environment to validate performance under concurrent user load and identify bottlenecks.

**Testing Duration**: ~2-4 hours per round  
**Prerequisites**: Staging environment running, Artillery or Apache Bench installed  
**Target Metrics**: Response time < 500ms, throughput > 100 req/s, error rate < 1%

---

## Prerequisites

### Install Artillery (Recommended)

Artillery is a modern load testing tool with excellent reporting capabilities.

```bash
# Install globally
npm install -g artillery

# Verify installation
artillery --version
```

### Alternative: Apache Bench

For simple baseline testing:

```bash
# Install (macOS)
brew install httpd

# Or on Linux
sudo apt-get install apache2-utils

# Verify
ab -h
```

---

## Test Scenarios

### Scenario 1: Authentication Flow Load Test

Test user registration and login under load.

**Artillery Configuration** (`load-test-auth.yml`):

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: 'Warm up'
    - duration: 300
      arrivalRate: 20
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 50
      name: 'Spike'
    - duration: 60
      arrivalRate: 5
      name: 'Cool down'
  processor: './load-test-processor.js'
  variables:
    userNum: 0

scenarios:
  - name: 'User Registration & Login'
    flow:
      - post:
          url: '/api/auth/register'
          json:
            email: 'user{{ userNum }}@load-test.com'
            password: 'LoadTest123!'
            name: 'Load Test User {{ userNum }}'
          capture:
            - json: '$.userId'
              as: 'userId'
          expect:
            - statusCode: 201
      - think: 2
      - post:
          url: '/api/auth/login'
          json:
            email: 'user{{ userNum }}@load-test.com'
            password: 'LoadTest123!'
          capture:
            - json: '$.token'
              as: 'token'
          expect:
            - statusCode: 200
```

**Run Test**:

```bash
artillery run load-test-auth.yml
```

**Expected Results**:
- Response time: < 500ms
- Error rate: < 1%
- Success: > 99%

---

### Scenario 2: Property Search Load Test

Test property listing and filtering endpoints.

**Artillery Configuration** (`load-test-properties.yml`):

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 300
      arrivalRate: 50
      name: 'Sustained load'
    - duration: 120
      arrivalRate: 100
      name: 'High load'
    - duration: 60
      arrivalRate: 10
      name: 'Cool down'

scenarios:
  - name: 'Property Search & Filtering'
    flow:
      - get:
          url: '/api/properties'
          expect:
            - statusCode: 200
      - think: 1
      - get:
          url: '/api/properties?minPrice=100000&maxPrice=500000&bedrooms=3'
          expect:
            - statusCode: 200
      - think: 2
      - get:
          url: '/api/properties/{{ randomNumber(1, 100) }}'
          expect:
            - statusCode: 200
```

**Run Test**:

```bash
artillery run load-test-properties.yml
```

**Expected Results**:
- Response time: < 300ms
- Error rate: < 0.5%
- Throughput: > 100 req/s

---

### Scenario 3: Portfolio Operations Load Test

Test portfolio CRUD operations with authentication.

**Artillery Configuration** (`load-test-portfolio.yml`):

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: 'Warm up'
    - duration: 300
      arrivalRate: 20
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 10
      name: 'Cool down'
  processor: './auth-processor.js'

scenarios:
  - name: 'Portfolio Management'
    flow:
      - function: 'getAuthToken'
      - post:
          url: '/api/portfolio'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            propertyId: 'prop-{{ randomNumber(1, 50) }}'
            purchasePrice: '{{ randomNumber(200000, 800000) }}'
            downPayment: '{{ randomNumber(40000, 160000) }}'
            notes: 'Load test property'
          expect:
            - statusCode: 201
      - think: 2
      - get:
          url: '/api/portfolio'
          headers:
            Authorization: 'Bearer {{ token }}'
          expect:
            - statusCode: 200
      - think: 1
      - put:
          url: '/api/portfolio/{{ portfolioId }}'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            notes: 'Updated during load test'
          expect:
            - statusCode: 200
```

**Run Test**:

```bash
artillery run load-test-portfolio.yml
```

**Expected Results**:
- Response time: < 500ms
- Error rate: < 1%
- Database writes successful: > 99%

---

### Scenario 4: Database Query Load Test

Test database performance under read/write load.

**Apache Bench Command**:

```bash
# 1000 requests with 50 concurrent connections
ab -n 1000 -c 50 http://localhost:3000/api/properties

# Results show:
# - Requests per second (throughput)
# - Mean time per request
# - Percentage served (90%, 95%, 99%)
```

**Expected Results**:
- Requests per second: > 100
- Mean time: < 500ms
- 95th percentile: < 1000ms

---

### Scenario 5: Spike Load Test

Test system behavior under sudden traffic spike.

**Artillery Configuration** (`load-test-spike.yml`):

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 30
      arrivalRate: 10
      name: 'Normal'
    - duration: 10
      arrivalRate: 100
      name: 'Spike - 10x traffic'
    - duration: 30
      arrivalRate: 10
      name: 'Recovery'

scenarios:
  - name: 'Mixed Operations'
    flow:
      - get:
          url: '/api/properties'
      - think: 1
      - get:
          url: '/api/market/trends'
      - think: 1
      - get:
          url: '/api/portfolio'
```

**Run Test**:

```bash
artillery run load-test-spike.yml
```

**Expected Results**:
- System recovers quickly (< 30s)
- Error rate spikes but recovers
- No cascading failures
- Database remains responsive

---

## Load Test Processor (auth-processor.js)

Create a processor file for handling authentication:

```javascript
module.exports = {
  getAuthToken: getAuthToken
};

async function getAuthToken(context, ee, next) {
  try {
    const response = await context.http.post({
      url: 'http://localhost:3000/api/auth/login',
      headers: { 'Content-Type': 'application/json' },
      json: {
        email: 'loadtest@example.com',
        password: 'LoadTest123!'
      }
    });

    if (response.statusCode === 200) {
      context.vars.token = response.json().token;
    }
  } catch (err) {
    console.error('Auth error:', err);
  }
  return next();
}
```

---

## Monitoring During Load Tests

### Real-time Monitoring

Monitor the backend and database during testing:

```bash
# Watch backend logs
docker-compose -f docker-compose.staging.yml logs -f backend

# Watch database logs
docker-compose -f docker-compose.staging.yml logs -f postgres

# Monitor container stats
docker stats --no-stream
```

### Key Metrics to Watch

```bash
# CPU usage (should not exceed 80%)
# Memory usage (should remain stable, not increase)
# Disk I/O (should remain reasonable)
# Network usage (should match expected throughput)
```

### Database Connection Monitoring

```bash
# Check active connections
docker-compose -f docker-compose.staging.yml exec postgres \
  psql -U staging_user -d wedding_staging \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker-compose -f docker-compose.staging.yml exec postgres \
  psql -U staging_user -d wedding_staging \
  -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## Performance Benchmarks

Record baseline performance metrics:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Auth endpoint (p95) | < 500ms | ___ ms | |
| Property search (p95) | < 300ms | ___ ms | |
| Portfolio operations (p95) | < 500ms | ___ ms | |
| API throughput | > 100 req/s | ___ req/s | |
| Error rate | < 1% | __% | |
| Database query time (avg) | < 100ms | ___ ms | |
| Spike recovery time | < 30s | ___ s | |
| Memory stability | No leak | ✓/✗ | |

---

## Load Test Results Template

### Test Run: [Date/Time]

**Environment**: Staging (Podman)  
**Test Duration**: [duration]  
**Concurrent Users**: [count]  
**Total Requests**: [count]

**Results**:

| Scenario | Requests | Errors | P95 Response | Throughput |
|----------|----------|--------|-------------|-----------|
| Auth Flow | [count] | [count] | [time] | [req/s] |
| Property Search | [count] | [count] | [time] | [req/s] |
| Portfolio Ops | [count] | [count] | [time] | [req/s] |
| Mixed Ops | [count] | [count] | [time] | [req/s] |
| Spike Test | [count] | [count] | [time] | [req/s] |

**Pass/Fail**: ✅ PASS / ❌ FAIL

**Notes**:
- [Key findings]
- [Performance bottlenecks]
- [Recommendations]

---

## Optimization Recommendations

If tests show performance issues:

### High Response Times
1. Add database indexes on frequently queried columns
2. Implement Redis caching for static data
3. Enable Gzip compression (already in nginx)
4. Optimize N+1 query problems in backend

### High Error Rate
1. Check database connection limits
2. Review application logs for errors
3. Increase resource limits (CPU/memory)
4. Add connection pooling

### Memory Leaks
1. Monitor heap usage during load test
2. Check for unclosed database connections
3. Review event listener cleanup in code
4. Profile with Node.js tools

### Database Performance
1. Add missing indexes
2. Enable query caching
3. Increase max connections
4. Review slow queries

---

## Load Testing Checklist

- [ ] Artillery or Apache Bench installed
- [ ] Staging environment running and healthy
- [ ] Test data loaded in database
- [ ] Monitoring tools ready (logs, stats)
- [ ] Baseline metrics recorded
- [ ] Auth test completed (✅/❌)
- [ ] Property search test completed (✅/❌)
- [ ] Portfolio operations test completed (✅/❌)
- [ ] Database query test completed (✅/❌)
- [ ] Spike load test completed (✅/❌)
- [ ] All metrics within targets (✅/❌)
- [ ] Results documented
- [ ] Optimization recommendations identified

---

## Next Steps

After load testing:

1. **If All Tests Pass**:
   - Document baseline performance
   - Proceed to production deployment
   - Set up production monitoring with same metrics

2. **If Issues Found**:
   - Implement optimizations
   - Re-run affected test scenarios
   - Verify improvements
   - Document root causes

3. **Performance Monitoring**:
   - Set up New Relic, Datadog, or similar
   - Configure alerts for performance degradation
   - Establish SLOs (Service Level Objectives)
   - Plan for scaling strategies

---

**Load Testing Complete!** ✓

Results have been validated. System is ready for production deployment if all tests pass.
