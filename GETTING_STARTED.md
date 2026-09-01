# Getting Started: AI Real Estate Investment Platform

Complete setup and deployment guide for the wedding2027 / AI Real Estate Investment Platform.

## Quick Start

### Prerequisites

- **Node.js**: v22.22.2+ (LTS)
- **npm**: v10.x+
- **PostgreSQL**: 15.x+ (for production) or local dev database
- **Git**: For version control

### Environment Setup

#### 1. Frontend Setup

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev --workspace=src/frontend

# Dev server runs on http://localhost:5173
```

#### 2. Backend Setup

```bash
# Install dependencies
npm install

# Create .env file in src/backend/
cat > src/backend/.env << 'ENV'
DATABASE_URL="postgresql://user:password@localhost:5432/wedding2027"
NODE_ENV="development"
SENTRY_DSN="https://your-sentry-dsn@sentry.io/xxx"
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="xxx"
PORT=3000
REDIS_URL="redis://localhost:6379"
ENV

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start backend dev server
npm run dev --workspace=src/backend

# Backend runs on http://localhost:3000
```

## Architecture

```
┌─────────────────────────────────────────────┐
│           React Frontend (5173)             │
│  - Portfolio Dashboard                      │
│  - Property Analysis                        │
│  - Transaction Tracking                     │
│  - Charts & Analytics                       │
└────────────┬────────────────────────────────┘
             │
             │ HTTP/REST
             │
┌────────────▼────────────────────────────────┐
│      Express.js API (3000)                  │
│  - 7-Layer Security Middleware              │
│  - Performance Monitoring                   │
│  - Error Tracking (Sentry)                  │
│  - Rate Limiting & Auth                     │
└────────────┬────────────────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───▼──┐ ┌──▼────┐ ┌─▼─────────┐
│ PG   │ │ Redis │ │ Supabase  │
│      │ │       │ │ (Storage) │
└──────┘ └───────┘ └───────────┘
```

## Database Setup

### PostgreSQL (Production)

```bash
# Create database
createdb wedding2027

# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
npm run db:seed --workspace=src/backend
```

### Prisma Schema

Key models:
- **User**: User accounts & authentication
- **Property**: Real estate property listings
- **PortfolioProperty**: Properties in user portfolios
- **Transaction**: Income/expense transactions
- **UserMetric**: Custom metrics & KPIs
- **EmailSchedule**: Automated email reports
- **MetricAlert**: Threshold-based alerts

### Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_feature_name

# Deploy migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

## Configuration

### Environment Variables

**Frontend** (.env.local in src/frontend):
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

**Backend** (.env in src/backend):
```
DATABASE_URL=postgresql://...
NODE_ENV=development
SENTRY_DSN=https://...@sentry.io/xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
REDIS_URL=redis://localhost:6379
PORT=3000
OTEL_ENABLED=false
```

### Security Configuration

The application includes a 7-layer security middleware stack:

1. **Sentry Integration**: Error tracking & performance monitoring
2. **JSON Parsing**: Request body parsing with size limits
3. **CORS**: Cross-origin resource sharing configuration
4. **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
5. **Rate Limiting**: IP-based, user-based, endpoint-specific limits
6. **Input Validation**: SQL injection & XSS detection
7. **Security Audit**: Request logging & compliance tracking

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in frontend
npm test --workspace=src/frontend

# Run tests in backend
npm test --workspace=src/backend

# Test coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Real device tests
npm run test:e2e:real-device
```

### Code Quality

```bash
# Build the project
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Performance Monitoring

```bash
# Run benchmarks
npm run bench:encryption
npm run bench:validation
npm run bench:serialization

# Performance report
curl http://localhost:3000/api/performance/report

# Load testing with K6
k6 run ./load-test.js --vus 100 --duration 60s
```

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security headers verified
- [ ] Performance benchmarks acceptable
- [ ] API health check: `curl http://localhost:3000/api/health`

### Building for Production

```bash
# Build both frontend and backend
npm run build

# Output:
# - src/frontend/dist/ (React app bundle)
# - src/backend/dist/ (Compiled TypeScript)
```

### Docker Deployment

```bash
# Build Docker image
docker build -t wedding2027:latest .

# Run container
docker run -p 3000:3000 -p 5173:5173 \
  -e DATABASE_URL=postgresql://... \
  -e SENTRY_DSN=... \
  wedding2027:latest
```

### Blue-Green Deployment

1. **Blue Environment** (new):
   - Deploy to blue environment
   - Run smoke tests (15 minutes)
   - Verify performance targets

2. **Traffic Cutover**:
   - Switch load balancer to blue
   - Monitor error rates
   - Keep green as rollback target

3. **Rollback** (if needed):
   - Switch load balancer back to green
   - Investigate issues
   - Create hotfix

See `DEPLOYMENT_CHECKLIST.md` for detailed procedures.

## Monitoring & Observability

### Logging

Logs available in:
- **Frontend**: Browser console, Sentry dashboard
- **Backend**: stdout/stderr, Sentry dashboard

### Metrics

Access performance metrics at:
```
http://localhost:3000/api/performance/report
```

Returns:
- Endpoint metrics (response times, error rates)
- Database query performance
- Cache hit rates
- System resource usage

### Error Tracking

All errors automatically captured by Sentry. View at:
```
https://sentry.io/organizations/xxx/issues/
```

### Distributed Tracing

Trace requests through the system using correlation IDs. Set `OTEL_ENABLED=true` for OpenTelemetry integration.

## Troubleshooting

### Backend Won't Start

**Error**: `Cannot find package '@sentry/profiling-node'`
- **Fix**: Already removed from codebase. Run `npm install` again.

**Error**: `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`
- **Fix**: Set environment variables in `.env` file.

**Error**: `Cannot connect to database`
- **Fix**: Verify `DATABASE_URL` in `.env` and that PostgreSQL is running.

### Frontend Won't Load

**Error**: `VITE_SUPABASE_URL is not defined`
- **Fix**: Create `.env.local` with Supabase credentials.

### Tests Failing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests again
npm test
```

## Support Resources

- **Documentation**: See `/docs` directory
- **Security**: `SECURITY_CHECKLIST.md`
- **Performance**: `PERFORMANCE_OPTIMIZATION.md`
- **Deployment**: `DEPLOYMENT_CHECKLIST.md`
- **Code Structure**: `README_COMPLETE.md`

## Next Steps

1. Set up local database (PostgreSQL or SQLite)
2. Configure environment variables
3. Run `npm install && npm run dev`
4. Access frontend at http://localhost:5173
5. Test API at http://localhost:3000/api/health
6. Review security & performance documentation

---

**Phase 7 Status**: ✅ 100% Complete
- Security infrastructure: ✅ Implemented
- Performance optimization: ✅ Implemented  
- Monitoring & observability: ✅ Implemented
- Testing framework: ✅ Implemented
- Documentation: ✅ Complete

Ready for production deployment.
