# Development Setup Guide

Complete guide to setting up and running the AI Real Estate Investment Platform locally.

## Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (recommended for database)
- Git

## Quick Start (5 minutes)

### 1. Start Database & Cache
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Update `.env.local` with your settings:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/realestate_db"
SUPABASE_URL="http://localhost:54321"
SUPABASE_KEY="your-local-key"
AI_SERVICE_URL="http://localhost:8000"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Set Up Database
```bash
npm run db:migrate --workspace=src/backend
npm run db:seed --workspace=src/backend
```

### 5. Run Services (3 terminals)

**Terminal 1 - Backend API:**
```bash
npm run dev --workspace=src/backend
# http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev --workspace=src/frontend
# http://localhost:5173
```

**Terminal 3 - AI Service:**
```bash
cd src/ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python src/main.py
# http://localhost:8000
```

## Testing the Setup

### 1. Check Services
- API: http://localhost:3001/health
- Frontend: http://localhost:5173
- AI Service: http://localhost:8000/docs

### 2. Create Account
1. Go to http://localhost:5173
2. Click "Sign In"
3. Create a new account
4. Browse sample properties (5 seeded)

### 3. Test AI Features
1. Click on any property
2. Click "Analyze Property with AI"
3. View AI valuation and scoring

## Database

### View Data
```bash
npm run db:studio --workspace=src/backend
# Opens http://localhost:5555
```

### Reset Database
```bash
# Delete migrations
rm -rf prisma/migrations

# Recreate from scratch
npm run db:migrate --workspace=src/backend
npm run db:seed --workspace=src/backend
```

## API Endpoints (Local)

### Properties
```
GET    /api/properties?city=Denver
GET    /api/properties/:id
POST   /api/properties/:id/favorites
DELETE /api/properties/:id/favorites
GET    /api/properties/favorites
```

### Portfolio (Auth Required)
```
GET    /api/portfolio
GET    /api/portfolio/summary
GET    /api/portfolio/:id
POST   /api/portfolio
PATCH  /api/portfolio/:id
DELETE /api/portfolio/:id
```

### AI Service
```
POST   /api/ai/valuation/estimate
POST   /api/ai/scoring/score
GET    /docs  (Interactive API docs)
```

## Common Issues

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Database Connection Error
```bash
# Check if Docker containers are running
docker-compose ps

# Start if not running
docker-compose up -d

# Check logs
docker-compose logs postgres
```

### Python Dependencies Issue
```bash
# Create fresh venv
rm -rf src/ai-service/venv
python -m venv src/ai-service/venv
source src/ai-service/venv/bin/activate
pip install -r src/ai-service/requirements.txt
```

### Supabase Connection Error
- Update DATABASE_URL in .env.local
- Ensure postgres container is running
- Check migration status: `npm run db:migrate --workspace=src/backend`

## Development Workflow

### Adding a New Feature
```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Install deps if needed
npm install

# 3. Make changes to backend/frontend/ai-service

# 4. Test locally (all 3 services running)

# 5. Commit
git add .
git commit -m "Add my feature"

# 6. Push
git push origin feature/my-feature
```

### Running Tests
```bash
# Backend
npm run test --workspace=src/backend

# Frontend  
npm run test --workspace=src/frontend
```

### Building for Production
```bash
# Build all
npm run build --workspaces

# Backend output: src/backend/dist/
# Frontend output: src/frontend/dist/
# AI Service: Docker image or deployment

# Then deploy to hosting:
# Frontend → Vercel
# Backend → Render/Railway/Fly.io
# AI Service → Same host as backend or separate
```

## Environment Variables Reference

| Variable | Description | Local Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection | postgres://postgres:postgres@localhost:5432/realestate_db |
| SUPABASE_URL | Supabase project URL | http://localhost:54321 |
| SUPABASE_KEY | Supabase anon key | local-key |
| SUPABASE_SERVICE_ROLE_KEY | Service role key | service-role-key |
| REDIS_URL | Redis connection | redis://localhost:6379 |
| PORT | Backend port | 3001 |
| AI_SERVICE_PORT | AI service port | 8000 |
| NODE_ENV | Environment | development |
| VITE_API_URL | API URL for frontend | http://localhost:3001 |

## Next Steps

1. **Explore the code**: Check `src/backend/src` and `src/frontend/src`
2. **Read the docs**: See `.claude/CLAUDE.md` for architecture details
3. **Try Phase 2**: Work on expanding AI models, data integrations
4. **Deploy**: Set up CI/CD with GitHub Actions

## Need Help?

- Check API docs: http://localhost:3001/api (after running backend)
- AI docs: http://localhost:8000/docs
- Database UI: http://localhost:5555 (Prisma Studio)
- GitHub Issues: Reference implementation details

## Useful Commands

```bash
# See all available commands
npm run

# Install specific workspace deps
npm install -w src/backend

# Run specific workspace script
npm run dev --workspace=src/backend

# Format code
npm run format

# Lint
npm run lint

# Type check
npm run type-check
```
