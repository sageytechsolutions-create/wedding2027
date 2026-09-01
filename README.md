# AI-Powered Real Estate Investment Platform

A modern full-stack application for analyzing, discovering, and managing real estate investments with AI-powered insights.

## Project Structure

```
├── src/
│   ├── backend/          # Node.js + Express backend
│   │   ├── src/
│   │   │   ├── config/   # Configuration files
│   │   │   ├── routes/   # API routes
│   │   │   ├── controllers/
│   │   │   ├── services/ # Business logic
│   │   │   └── middleware/
│   │   └── package.json
│   └── frontend/         # React + Vite frontend
│       ├── src/
│       │   ├── pages/    # Page components
│       │   ├── components/
│       │   ├── store/    # Zustand stores
│       │   └── lib/      # Utility functions
│       └── package.json
├── prisma/               # Database schema
└── .env.example          # Environment template
```

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand (State Management)
- React Router

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL/Supabase
- Zod (Validation)

### Authentication
- Supabase Auth (Magic Link, Email/Password)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (or Supabase account for managed hosting)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Set up the database:**
   ```bash
   npm run db:migrate --workspace=src/backend
   ```

### Running Locally

**Terminal 1 - Backend:**
```bash
npm run dev --workspace=src/backend
```
Backend runs on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev --workspace=src/frontend
```
Frontend runs on `http://localhost:5173`

## API Endpoints (Phase 1)

### Properties
- `GET /api/properties` - Search properties
- `GET /api/properties/:id` - Get property details
- `POST /api/properties/:propertyId/favorites` - Add to favorites
- `DELETE /api/properties/:propertyId/favorites` - Remove from favorites
- `GET /api/properties/favorites` - Get favorite properties

### Portfolio
- `GET /api/portfolio` - Get user's portfolio
- `GET /api/portfolio/summary` - Portfolio metrics
- `GET /api/portfolio/:id` - Property details
- `POST /api/portfolio` - Add property to portfolio
- `PATCH /api/portfolio/:id` - Update property
- `DELETE /api/portfolio/:id` - Remove property

### Transactions
- `POST /api/transactions` - Add transaction
- `GET /api/transactions` - List transactions
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/analytics/category-totals` - Category totals

## Database Schema (Phase 1)

### Core Tables
- `users` - User accounts
- `properties` - Property listings
- `portfolio_properties` - User's owned properties
- `transactions` - Income/expenses tracking
- `favorites` - Bookmarked properties

## Deployment

### Frontend (Vercel)
```bash
npm run build --workspace=src/frontend
# Deploy the dist/ folder to Vercel
```

### Backend (Render, Railway, or Fly.io)
```bash
npm run build --workspace=src/backend
# Set DATABASE_URL and SUPABASE_* env vars
# Deploy the src/backend directory
```

## Next Steps (Phase 2)

- [ ] Set up Supabase project with authentication
- [ ] Integrate real estate data APIs (Zillow, Redfin)
- [ ] Build AI/ML service (Python FastAPI)
- [ ] Implement property valuation model
- [ ] Add investment scoring engine
- [ ] Build deal recommendation system

## Contributing

Follow the existing code structure and style. All new features should include:
- TypeScript types
- Error handling
- Input validation (Zod)
- API documentation

## License

MIT
