# Staging Deployment Instructions

## Overview

This guide walks through deploying the Wedding Planning Platform to a staging environment using Docker Compose. The setup includes:

- **Backend API** (Node.js/Express) on port 3000
- **Frontend Web App** (React/Nginx) on port 3001
- **PostgreSQL Database** on port 5432
- **Redis Cache** on port 6379
- **Nginx Reverse Proxy** on port 80 (optional)

**Deployment Time**: ~10-15 minutes  
**Disk Space Required**: ~1 GB  
**Memory Required**: 2+ GB

---

## Prerequisites

### Local Machine / Staging Server

```bash
# Check Docker
docker --version          # >= 20.10
docker-compose --version  # >= 2.0

# Or on newer systems
docker compose --version  # Built-in compose
```

### Required Tools

```bash
# Install Docker (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Start Docker daemon
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (optional, requires logout)
sudo usermod -aG docker $USER
```

---

## Step 1: Prepare Staging Environment

### 1a. Clone Repository

```bash
# Clone the repository
git clone https://github.com/sageytechsolutions-create/wedding2027.git
cd wedding2027

# Verify files exist
ls -la docker-compose.staging.yml
ls -la nginx.staging.conf
ls -la .env.staging
```

### 1b. Configure Environment

```bash
# Copy environment file
cp .env.staging .env.staging.local

# Edit with your configuration
nano .env.staging.local

# Update these values:
# - POSTGRES_PASSWORD (change from "staging_password_change_me")
# - DATABASE_URL (update password)
# - Add any secrets (SENTRY_DSN, JWT_SECRET, etc.)
```

### 1c. Create Required Directories

```bash
# Create directories for logs and certificates
mkdir -p logs
mkdir -p certs
chmod 755 logs certs

# Create empty log files
touch logs/backend.log logs/nginx.log
```

---

## Step 2: Pull Docker Images

### Authenticate with GitHub Container Registry

```bash
# Log in to ghcr.io
docker login ghcr.io

# Enter credentials:
# Username: your_github_username
# Password: your_personal_access_token (with read:packages scope)
```

### Pull Images

```bash
# Pull backend image
docker pull ghcr.io/sageytechsolutions-create/wedding2027/backend:latest

# Pull frontend image
docker pull ghcr.io/sageytechsolutions-create/wedding2027/frontend:latest

# Verify images
docker images | grep wedding2027
```

---

## Step 3: Start Staging Environment

### Option A: Using docker-compose (Recommended)

```bash
# Start all services
docker-compose -f docker-compose.staging.yml up -d

# Expected output:
# Creating wedding-staging-db ... done
# Creating wedding-staging-cache ... done
# Creating wedding-staging-backend ... done
# Creating wedding-staging-frontend ... done
# Creating wedding-staging-proxy ... done
```

### Option B: Individual Services

```bash
# Start specific services
docker-compose -f docker-compose.staging.yml up -d postgres redis
# Wait for databases to be ready
sleep 10

# Start backend
docker-compose -f docker-compose.staging.yml up -d backend
sleep 5

# Start frontend
docker-compose -f docker-compose.staging.yml up -d frontend

# Start nginx (optional)
docker-compose -f docker-compose.staging.yml up -d nginx
```

---

## Step 4: Verify Services

### Check Container Status

```bash
# View all running containers
docker-compose -f docker-compose.staging.yml ps

# Expected status: "Up" for all services
```

### Check Service Health

```bash
# Backend health
curl http://localhost:3000/health
# Expected: {"status":"ok", ...}

# Frontend health
curl http://localhost:3001/
# Expected: HTML content (React app)

# Database connection
docker-compose -f docker-compose.staging.yml exec postgres \
  pg_isready -U staging_user

# Redis connection
docker-compose -f docker-compose.staging.yml exec redis \
  redis-cli ping
# Expected: PONG
```

### View Logs

```bash
# View all logs
docker-compose -f docker-compose.staging.yml logs

# Follow backend logs
docker-compose -f docker-compose.staging.yml logs -f backend

# Follow frontend logs
docker-compose -f docker-compose.staging.yml logs -f frontend

# View last 50 lines
docker-compose -f docker-compose.staging.yml logs --tail 50
```

---

## Step 5: Database Initialization

### Create Database Schema

```bash
# Run migrations (if using Prisma)
docker-compose -f docker-compose.staging.yml exec backend \
  npm run db:migrate

# Seed sample data (if applicable)
docker-compose -f docker-compose.staging.yml exec backend \
  npm run db:seed
```

### Verify Database

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.staging.yml exec postgres \
  psql -U staging_user -d wedding_staging

# List tables
\dt

# View user roles
\du

# Exit
\q
```

---

## Step 6: Test API Endpoints

### Basic Connectivity

```bash
# Backend health
curl -X GET http://localhost:3000/health

# Frontend load
curl -X GET http://localhost:3001/

# Check backend logs
docker-compose -f docker-compose.staging.yml logs backend | tail -20
```

### API Endpoints

```bash
# Example API calls (adjust based on your endpoints)
curl -X GET http://localhost:3000/api/properties

curl -X GET http://localhost:3000/api/portfolio

curl -X GET http://localhost:3000/api/market/trends

# With authentication (if required)
curl -X GET http://localhost:3000/api/protected \
  -H "Authorization: Bearer <token>"
```

### Frontend Testing

Open in browser:
```
http://localhost:3001/
```

Verify:
- [ ] Page loads without errors
- [ ] No 502/503 errors
- [ ] API calls work (check Network tab)
- [ ] No console errors (DevTools)

---

## Step 7: Access Services

### Direct Access

```
Frontend:  http://localhost:3001/
Backend:   http://localhost:3000/api/
Database:  localhost:5432 (PostgreSQL)
Cache:     localhost:6379 (Redis)
```

### Via Nginx Proxy (if running)

```
http://localhost:80/        → Frontend
http://localhost:80/api/    → Backend API
```

---

## Step 8: Monitoring & Logs

### Real-time Monitoring

```bash
# Watch container stats
docker stats

# Watch logs in real-time
docker-compose -f docker-compose.staging.yml logs -f

# Filter by service
docker-compose -f docker-compose.staging.yml logs -f backend
```

### Log Locations

```bash
# Container logs
docker-compose -f docker-compose.staging.yml logs backend > backend.log

# Database logs
docker-compose -f docker-compose.staging.yml logs postgres

# Frontend logs
docker-compose -f docker-compose.staging.yml logs frontend
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.staging.yml logs backend

# Inspect container
docker inspect wedding-staging-backend

# Restart service
docker-compose -f docker-compose.staging.yml restart backend
```

### Database Connection Error

```bash
# Verify database is running
docker-compose -f docker-compose.staging.yml ps postgres

# Check connection
docker-compose -f docker-compose.staging.yml exec postgres \
  psql -U staging_user -d wedding_staging -c "SELECT 1"

# Restart database
docker-compose -f docker-compose.staging.yml restart postgres
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Kill process
kill -9 <PID>

# Or change ports in docker-compose.staging.yml
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune
```

---

## Management Commands

### Stop Services

```bash
# Stop all services (keeps data)
docker-compose -f docker-compose.staging.yml stop

# Stop specific service
docker-compose -f docker-compose.staging.yml stop backend
```

### Start Services

```bash
# Start all services
docker-compose -f docker-compose.staging.yml start

# Start specific service
docker-compose -f docker-compose.staging.yml start backend
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.staging.yml restart

# Restart specific service
docker-compose -f docker-compose.staging.yml restart backend
```

### Remove Services (Delete Data)

```bash
# Stop and remove containers
docker-compose -f docker-compose.staging.yml down

# Remove volumes too (DELETE DATABASE)
docker-compose -f docker-compose.staging.yml down -v

# Remove volumes and images
docker-compose -f docker-compose.staging.yml down -v --rmi all
```

---

## Backup & Recovery

### Backup Database

```bash
# Dump database to file
docker-compose -f docker-compose.staging.yml exec postgres \
  pg_dump -U staging_user wedding_staging > backup.sql

# Compress backup
gzip backup.sql
```

### Restore Database

```bash
# Restore from backup
docker-compose -f docker-compose.staging.yml exec -T postgres \
  psql -U staging_user wedding_staging < backup.sql

# Or from compressed backup
gunzip -c backup.sql.gz | \
  docker-compose -f docker-compose.staging.yml exec -T postgres \
  psql -U staging_user wedding_staging
```

---

## Staging Go/No-Go Checklist

Before promoting to production, verify:

### Connectivity
- [ ] Frontend loads without errors
- [ ] API endpoints return 200 OK
- [ ] Database queries work
- [ ] Redis cache responds
- [ ] All containers show "Up" status

### Functionality
- [ ] User authentication works
- [ ] Property search functional
- [ ] Portfolio features operational
- [ ] Market data displays correctly
- [ ] Transactions can be created/updated

### Performance
- [ ] API response time < 500ms
- [ ] Frontend load time < 3 seconds
- [ ] Database queries < 100ms
- [ ] No memory leaks (memory stable)
- [ ] CPU usage reasonable

### Security
- [ ] No errors in logs
- [ ] Environment variables not exposed
- [ ] Database passwords secure
- [ ] API authentication enforced
- [ ] CORS configured correctly

### Data
- [ ] Database initialized successfully
- [ ] Sample data loaded
- [ ] Backups working
- [ ] Data persistence verified

---

## Next Steps

### If Staging is Healthy ✅

1. Document configuration
2. Create standard operating procedures
3. Set up monitoring (Sentry, Prometheus)
4. Configure alerting
5. Plan production deployment

### If Issues Found ❌

1. Review logs for errors
2. Check configuration
3. Verify environment variables
4. Test individual components
5. Debug and fix issues
6. Re-test from Step 4

---

## Production Deployment

Once staging is validated:

1. Set up production servers
2. Configure production GitHub secrets
3. Update docker-compose for production
4. Enable SSL/TLS certificates
5. Configure domain names
6. Enable monitoring and alerting
7. Create deployment documentation
8. Plan rollback procedures

---

## Support & Documentation

- **Backend Logs**: `docker-compose logs backend`
- **Frontend Logs**: `docker-compose logs frontend`
- **Database Logs**: `docker-compose logs postgres`
- **Full Documentation**: See PRODUCTION_DEPLOYMENT_MANUAL.md
- **Troubleshooting**: See INCIDENT_RESPONSE_PLAYBOOK.md

---

**Staging Environment Ready!** 🚀

Once verified, you can:
- Test features thoroughly
- Load test the system
- Verify security configuration
- Document procedures
- Plan production deployment
