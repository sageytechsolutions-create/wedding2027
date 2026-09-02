# Backend Testing Guide

## Overview

This guide covers the testing infrastructure for the AI Real Estate Backend API. We use **Vitest** as our testing framework with comprehensive unit and integration tests across controllers and services.

## Test Structure

### Total Tests: ~110+ Tests
- **Controller Tests**: 46 tests (3 files)
- **Service Tests**: 66 tests (3 files)
- **Coverage**: Controllers, Services, Business Logic

### Test Files Location
```
src/backend/src/
├── controllers/__tests__/
│   ├── portfolio.test.ts    (16 tests)
│   ├── property.test.ts     (15 tests)
│   └── transaction.test.ts  (15 tests)
└── services/__tests__/
    ├── portfolio.test.ts    (22 tests)
    ├── property.test.ts     (20 tests)
    └── transaction.test.ts  (24 tests)
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- portfolio.test.ts
npm test -- property.test.ts
npm test -- transaction.test.ts
```

### Run Tests by Pattern
```bash
npm test -- portfolio          # Run all portfolio tests
npm test -- services           # Run all service tests
npm test -- controllers        # Run all controller tests
```

## Test Configuration

### Vitest Config (vitest.config.ts)
- **Environment**: Node
- **Globals**: Enabled (no import for describe, it, expect)
- **Setup File**: `src/test/setup.ts`
- **Coverage Provider**: v8
- **Coverage Reporters**: text, json, html

### Setup File (src/test/setup.ts)
Configures:
- Environment variables for tests
- Prisma client mock
- Supabase client mock
- Global test cleanup

## Test Categories

### Controller Tests (46 tests)

#### PortfolioController (16 tests)
**File**: `src/controllers/__tests__/portfolio.test.ts`

Tests include:
- `getPortfolio`: Returns portfolio, handles 401 errors, handles service errors
- `getPortfolioSummary`: Returns summary, requires authentication
- `getPropertyDetails`: Returns details, requires authentication
- `addProperty`: Creates with valid data, validates fields, handles errors
- `updateProperty`: Updates properties, supports partial updates, handles errors
- `removeProperty`: Deletes with 204 status, handles errors
- Data contracts: Validates response shapes

**Key Patterns**:
- Service mocking with `vi.mock()`
- Zod validation for input
- Authentication via `req.userId`
- Error handling via `next()` middleware

#### PropertyController (15 tests)
**File**: `src/controllers/__tests__/property.test.ts`

Tests include:
- `search`: Default pagination, custom filters, validation errors
- `getById`: Fetch single property
- `addToFavorites`: Requires auth, with/without notes
- `removeFromFavorites`: 204 response, requires auth
- `getFavorites`: Pagination support, filtering

#### TransactionController (15 tests)
**File**: `src/controllers/__tests__/transaction.test.ts`

Tests include:
- `addTransaction`: Income/expense/mortgage types, validation
- `getTransactions`: All transactions, filtered by property
- `updateTransaction`: Partial updates, access control
- `deleteTransaction`: 204 response, ownership verification
- `getCategoryTotals`: Date range filtering, aggregation

### Service Tests (66 tests)

#### PortfolioService (22 tests)
**File**: `src/services/__tests__/portfolio.test.ts`

Tests include:
- **addProperty** (5 tests)
  - Adds property to portfolio
  - Verifies property exists
  - Prevents duplicates
  - Accepts optional loan parameters
  - Calculates metrics correctly

- **getPortfolio** (3 tests)
  - Returns all properties with calculated metrics
  - Handles empty portfolios
  - Filters by userId correctly

- **getPortfolioSummary** (2 tests)
  - Returns summary with financial metrics
  - Calculates ROI, gains, cash flow

- **getPropertyDetails** (3 tests)
  - Fetches property details
  - Access control (user ownership)
  - Not found error handling

- **updateProperty** (4 tests)
  - Updates property values
  - Partial updates supported
  - Access control
  - Field-level updates

- **removeProperty** (3 tests)
  - Removes from portfolio
  - Access control
  - Not found errors

#### PropertyService (20 tests)
**File**: `src/services/__tests__/property.test.ts`

Tests include:
- **search** (5 tests)
  - Filters by price, location, bedrooms
  - Pagination (page, limit)
  - Multiple filter combinations

- **getById** (2 tests)
  - Fetch by ID
  - Not found error handling

- **addToFavorites** (2 tests)
  - With and without notes
  - User association

- **removeFromFavorites** (2 tests)
  - Remove from favorites
  - Composite key lookup

- **getFavorites** (3 tests)
  - Pagination support
  - User filtering
  - Sorting and ordering

#### TransactionService (24 tests)
**File**: `src/services/__tests__/transaction.test.ts`

Tests include:
- **addTransaction** (4 tests)
  - Income, expense, mortgage types
  - Optional description field
  - User association

- **getTransactions** (4 tests)
  - All transactions for user
  - Filter by portfolio property
  - Empty result handling
  - Sorting by date

- **updateTransaction** (4 tests)
  - Update amount and description
  - Partial updates
  - Access control
  - Not found errors

- **deleteTransaction** (3 tests)
  - Remove transaction
  - Access control
  - Not found errors

- **getCategoryTotals** (4 tests)
  - Aggregate by category
  - Calculate totals and counts
  - Date range filtering
  - Empty result handling

## Test Fixtures

**File**: `src/test/fixtures.ts`

Mock data for consistent testing:
- `mockPortfolio`: Complete portfolio object
- `mockProperty`: Property with all financial details
- `mockEmailSchedule`: Email configuration
- `mockCustomMetric`: Custom metric definition
- `mockMetricAlert`: Threshold alert
- `mockPortfolioSnapshot`: Aggregated metrics
- `mockPortfolioHealth`: Health assessment
- `mockTransaction`: Transaction example
- `mockCategoryTotals`: Category aggregation
- `mockSearchProperty`: Search result item
- `mockFavorite`: Favorited property

## Mocking Strategy

### Prisma Client
Uses `vi.mock()` to replace Prisma with mock implementation:

```typescript
vi.mock('../../config/database', () => ({
  prisma: {
    portfolioProperty: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // ... other models
  },
}));
```

### Service Mocking
Controllers mock services using `vi.mock()`:

```typescript
vi.mock('../../services/portfolioService');
import { PortfolioService } from '../../services/portfolioService';
// Now use vi.mocked(PortfolioService.method)
```

## Best Practices

### Writing Tests
1. **Clear Test Names**: Describe what should happen
   - ✅ "should add property to portfolio"
   - ❌ "test addProperty"

2. **Arrange-Act-Assert**: Clear test structure
   ```typescript
   // Arrange
   mockPrisma.property.findUnique.mockResolvedValue(mockProperty);
   
   // Act
   const result = await PortfolioService.addProperty('user_1', input);
   
   // Assert
   expect(result).toHaveProperty('propertyId');
   ```

3. **Test Edge Cases**:
   - Authentication failures
   - Validation errors
   - Not found scenarios
   - Access control

4. **Use Fixtures**: Leverage mock data for consistency
   ```typescript
   import { mockProperty } from '../../test/fixtures';
   ```

### Debugging Tests
1. **Run Single Test**:
   ```bash
   npm test -- --grep "should add property"
   ```

2. **Verbose Output**:
   ```bash
   npm test -- --reporter=verbose
   ```

3. **Debug in VSCode**:
   ```json
   {
     "type": "node",
     "request": "launch",
     "program": "${workspaceFolder}/node_modules/.bin/vitest",
     "args": ["run"],
     "console": "integratedTerminal"
   }
   ```

## Coverage Goals

### Current Coverage
- Controllers: 46 tests covering main CRUD operations
- Services: 66 tests covering business logic
- **Target**: 80%+ coverage for core services

### Areas Not Yet Covered
- Email/Metrics/Report services (deferred)
- Integration between multiple services
- Error recovery and retry logic
- Concurrent operation handling
- Database transaction rollback

## Known Issues and Limitations

### Prisma Initialization
Some controllers (email, metrics, report) initialize Prisma directly at module load, causing test timeout issues. These require:
1. Refactoring to lazy initialization
2. Dependency injection for testing
3. Or dedicated integration test database

### Missing Service Implementations
The following services have no tests yet:
- `emailService`
- `metricsCalculationService`
- `reportGenerationService`
- `reportCacheService`
- `portfolioDataService`
- `emailQueueService`
- `emailDeliveryService`

These require proper database setup or mocking implementation first.

## CI/CD Integration

### GitHub Actions Workflow
**File**: `.github/workflows/backend-tests.yml`

Runs on:
- Push to `main`, `develop`, `claude/**` branches
- All pull requests

Testing steps:
1. Checkout code
2. Setup Node.js (18.x, 20.x)
3. Install dependencies
4. Run linter
5. Run tests
6. Generate coverage report
7. Upload to Codecov

## Future Improvements

### Phase 5 Sprint 3+
- [ ] Integration tests across multiple services
- [ ] E2E tests with test database
- [ ] Performance benchmarking
- [ ] Load testing for email queue
- [ ] Cache behavior testing
- [ ] Concurrent operation tests
- [ ] Error recovery scenarios

### Test Database Setup
- PostgreSQL test instance
- Automatic migrations for each test suite
- Cleanup after each test
- Seeding with test data

### Playwright E2E Tests
- Critical user paths
- API response validation
- UI integration testing
- Performance monitoring

## Useful Commands

```bash
# Run tests in watch mode (auto-rerun on file changes)
npm test -- --watch

# Run with coverage report
npm test -- --coverage

# Update snapshots
npm test -- -u

# Run tests in parallel (default behavior)
npm test -- --reporter=verbose

# Run tests for specific file
npm test -- portfolio

# Run tests matching pattern
npm test -- --grep "should add"

# Run single test
npm test -- --grep "should add property to portfolio"

# Run with HTML coverage report
npm test -- --coverage && open coverage/index.html
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Jest Expect API](https://jestjs.io/docs/expect)
- [Prisma Mocking](https://www.prisma.io/docs/orm/prisma-client/testing/unit-tests)
- [Test Fixtures Best Practices](https://github.com/testingjavascript/testing-javascript-course)
