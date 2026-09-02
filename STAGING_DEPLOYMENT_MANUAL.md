# Staging Deployment Manual - Phase 7 Sprint 3

**Status**: ✅ Ready for execution  
**Date**: 2026-09-02  
**Branch**: `claude/ai-investment-realestate-intpuu`

---

## Quick Start - Deploy to Staging

This manual guides the team through deploying Phase 7 Sprint 3 to the staging environment.

### Prerequisites

**On Your Local Machine or CI/CD Server:**
- Docker Desktop (latest version with Compose v5+)
- Git with access to the repository
- ~5 minutes for initial deployment

**Environment Variables Required:**
```bash
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/realestate_staging

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Security
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# External Services (optional for staging)
SENTRY_DSN=https://your-staging-key@sentry.io/project
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_KEY=your-staging-anon-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## Deployment Steps

### Step 1: Prepare the Environment

```bash
# Clone or pull latest code
git clone https://github.com/sageytechsolutions-create/wedding2027.git
cd wedding2027

# Switch to staging branch
git checkout claude/ai-investment-realestate-intpuu
git pull origin claude/ai-investment-realestate-intpuu

# Create .env file for staging
cat > .env.staging << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/realestate_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=realestate_db

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Security - Generate new for staging
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Sentry (optional)
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1

# Supabase (optional)
SUPABASE_URL=
SUPABASE_KEY=

# SMTP (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# Node environment
NODE_ENV=staging
PORT=3000
EOF

# Load environment
export $(cat .env.staging | grep -v '#' | xargs)
```

### Step 2: Validate Docker Configuration

```bash
# Check Docker is running
docker ps

# Validate compose file
docker compose -f docker-compose.yml config

# Show what will be deployed
docker compose -f docker-compose.yml config --services
```

Expected output:
```
postgres
redis
backend
frontend
```

### Step 3: Start Staging Services

```bash
# Pull latest images
docker compose -f docker-compose.yml pull

# Start services in background
docker compose -f docker-compose.yml up -d

# Watch startup logs
docker compose -f docker-compose.yml logs -f

# Expected output after ~30-40 seconds:
# postgres: ready
# redis: ready
# backend: Server listening on port 3000
# frontend: ready
```

### Step 4: Verify Services Are Healthy

**Check Database:**
```bash
docker compose -f docker-compose.yml ps postgres
# Status should show: healthy

docker exec realestate-db pg_isready -U postgres
# Output: accepting connections
```

**Check Redis:**
```bash
docker exec realestate-cache redis-cli ping
# Output: PONG
```

**Check Backend Health:**
```bash
curl -v http://localhost:3000/health
# Expected: 200 OK
# Response: { "status": "ok" }
```

**Check Frontend:**
```bash
curl -v http://localhost:3001/
# Expected: 200 OK
# Response: HTML content
```

### Step 5: Run Smoke Tests

```bash
# Create smoke test script
cat > /tmp/smoke-tests.sh << 'TESTS'
#!/bin/bash

echo "🧪 Running Smoke Tests..."

# Test 1: Backend Health
echo "Test 1: Backend Health Check..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Backend health check passed"
else
  echo "❌ Backend health check failed"
  exit 1
fi

# Test 2: Frontend Load
echo "Test 2: Frontend Page Load..."
if curl -f http://localhost:3001/ > /dev/null 2>&1; then
  echo "✅ Frontend loaded successfully"
else
  echo "❌ Frontend failed to load"
  exit 1
fi

# Test 3: API Response
echo "Test 3: Sample API Call..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ API responding correctly"
else
  echo "❌ API not responding"
  exit 1
fi

echo ""
echo "✅ All smoke tests passed!"
TESTS

chmod +x /tmp/smoke-tests.sh
/tmp/smoke-tests.sh
```

### Step 6: Verify Database Connectivity

```bash
# Test connection from backend
docker exec realestate-db psql -U postgres -d realestate_db -c "SELECT version();"

# Create test table
docker exec realestate-db psql -U postgres -d realestate_db << 'SQL'
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL PRIMARY KEY,
  checked_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO health_check DEFAULT VALUES;
SELECT * FROM health_check ORDER BY checked_at DESC LIMIT 1;
SQL
```

### Step 7: Access Staging Environment

**Frontend**: http://localhost:3001  
**Backend API**: http://localhost:3000/api  
**Health Endpoint**: http://localhost:3000/health  

---

## Monitoring & Verification

### Check Service Status

```bash
# View all running services
docker compose -f docker-compose.yml ps

# Monitor logs in real-time
docker compose -f docker-compose.yml logs -f

# View specific service logs
docker compose -f docker-compose.yml logs backend
docker compose -f docker-compose.yml logs frontend
docker compose -f docker-compose.yml logs postgres
```

### Performance Baseline

```bash
# Check resource usage
docker stats

# Expected during normal load:
# - Backend: < 100MB memory
# - Frontend: < 50MB memory
# - PostgreSQL: < 200MB memory
# - Redis: < 50MB memory
```

### Database Verification

```bash
# Check tables created
docker exec realestate-db psql -U postgres -d realestate_db \
  -c "\dt"

# Check row counts
docker exec realestate-db psql -U postgres -d realestate_db \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname != 'pg_catalog' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Stopping Staging Services

```bash
# Stop all services (keep volumes)
docker compose -f docker-compose.yml stop

# Remove all services (keep volumes)
docker compose -f docker-compose.yml down

# Remove everything including volumes (clean slate)
docker compose -f docker-compose.yml down -v
```

---

## Troubleshooting

### Issue: Services Won't Start

```bash
# View error logs
docker compose -f docker-compose.yml logs

# Check Docker daemon
docker ps

# Restart Docker
systemctl restart docker  # or Docker Desktop app
```

### Issue: Database Connection Errors

```bash
# Check PostgreSQL is ready
docker exec realestate-db pg_isready -U postgres

# Test connection string
psql "postgresql://postgres:postgres@localhost:5432/realestate_db" -c "SELECT 1;"

# View database logs
docker compose -f docker-compose.yml logs postgres
```

### Issue: Frontend Shows Blank Page

```bash
# Check frontend logs
docker compose -f docker-compose.yml logs frontend

# Verify build artifacts
docker exec $(docker ps -q -f "name=frontend") ls -la /usr/share/nginx/html/

# Check API connection
curl http://localhost:3000/health
```

### Issue: High Memory Usage

```bash
# Check what's using memory
docker stats

# Limit container memory
docker update --memory 512m $(docker ps -q)

# Restart with limits
docker compose -f docker-compose.yml down
docker compose -f docker-compose.yml up -d
```

---

## Post-Deployment Verification Checklist

```
☐ All services running (docker compose ps shows 'running')
☐ Health checks passing
☐ Database connectivity verified
☐ Frontend loads without errors
☐ API endpoints responding
☐ No critical errors in logs
☐ Memory usage normal
☐ Smoke tests all pass
☐ Team notified of deployment
```

---

## Next Steps

### If Successful
- ✅ Review staging environment
- ✅ Run full test suite
- ✅ Conduct UAT (User Acceptance Testing)
- ✅ Plan production deployment

### If Issues Found
1. Capture error logs: `docker compose logs > staging-error.log`
2. Review DEPLOYMENT_OPERATIONS_MANUAL.md troubleshooting section
3. Contact DevOps team or consult GitHub PR #2 discussion

---

## GitHub Actions Alternative

To deploy via GitHub Actions instead of manual execution:

1. Push code to main branch
2. GitHub Actions automatically:
   - Builds Docker images
   - Pushes to container registry
   - Deploys to staging environment
   - Runs smoke tests
   - Posts Slack notification

Monitor deployment: GitHub Actions → `deploy-application` workflow

---

## Rollback Procedure

If staging deployment fails:

```bash
# Stop staging services
docker compose -f docker-compose.yml down

# Remove problematic images
docker rmi wedding2027-backend:latest wedding2027-frontend:latest

# Restart from previous commit
git checkout HEAD~1
docker compose -f docker-compose.yml up -d
```

---

## Support

For deployment issues:
1. Check DEPLOYMENT_OPERATIONS_MANUAL.md (sections 6-7)
2. Review logs with: `docker compose logs > debug.log`
3. Consult PR #2 for team discussion
4. Contact DevOps: [slack channel or email]

---

**Deployment Ready**: ✅ All infrastructure configured and verified  
**Configuration Status**: ✅ Docker Compose files valid  
**Documentation**: ✅ Complete operational guides available

**Ready to proceed with staging deployment!**
