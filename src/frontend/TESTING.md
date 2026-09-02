# Frontend Testing Guide

## Overview

The frontend testing suite provides comprehensive coverage of services, components, and integration workflows. All tests use Vitest with React Testing Library for component tests.

**Test Statistics:**
- Total Tests: 102
- Service Unit Tests: 67
- Component Tests: 18
- Integration Tests: 17
- Test Files: 5
- Coverage Target: 80%+

## Test Structure

```
src/frontend/
├── src/
│   ├── services/
│   │   └── __tests__/
│   │       ├── reportService.test.ts (17 tests)
│   │       ├── emailService.test.ts (22 tests)
│   │       ├── metricsService.test.ts (28 tests)
│   │       └── integration.test.ts (17 tests)
│   ├── pages/
│   │   └── __tests__/
│   │       └── Dashboard.test.tsx (18 tests)
│   └── test/
│       ├── setup.ts (global test initialization)
│       ├── mocks/
│       │   └── api.ts (API client mocks)
│       └── fixtures/
│           └── data.ts (mock data for all services)
├── vitest.config.ts (Vitest configuration)
└── TESTING.md (this file)
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Development)
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### UI Mode (Visual Test Runner)
```bash
npm test -- --ui
```

### Specific Test File
```bash
npm test -- src/services/__tests__/reportService.test.ts
```

### Specific Test Suite
```bash
npm test -- --grep "Portfolio Health"
```

## Test Categories

### 1. Service Unit Tests (67 tests)

Services are tested in isolation with mocked API responses.

#### reportService.test.ts (17 tests)
- `generateReport()` - 3 tests
  - Correct parameters
  - Default report type
  - Multiple report types
  - Error handling

- `getPortfolioSnapshot()` - 2 tests
  - Fetch portfolio data
  - Metric validation

- `getPortfolioHealth()` - 2 tests
  - Health assessment
  - Recommendations

- `getPortfolioTrends()` - 2 tests
  - Default period (12 months)
  - Custom month ranges

- `getAggregations()` - 3 tests
  - Property aggregations
  - City aggregations
  - All aggregations

- `getCacheStatus()` - 1 test
- `clearCache()` - 1 test
- `downloadReport()` - 2 tests
  - Successful download
  - Error handling

#### emailService.test.ts (22 tests)
- `createSchedule()` - 3 tests
- `getSchedules()` - 2 tests
- `getSchedule()` - 1 test
- `updateSchedule()` - 3 tests
- `deleteSchedule()` - 2 tests
- `sendTestEmail()` - 3 tests
- `getDeliveryLogs()` - 3 tests
- `getQueueStatus()` - 1 test
- `verifyConnection()` - 3 tests

#### metricsService.test.ts (28 tests)
- `getAvailableMetrics()` - 2 tests
- `calculateMetric()` - 5 tests
- `validateFormula()` - 3 tests
- `getMetricHistory()` - 3 tests
- `createAlert()` - 3 tests
- `getAlerts()` - 2 tests
- `acknowledgeAlert()` - 2 tests
- `updateMetric()` - 5 tests
- `deleteMetric()` - 3 tests

### 2. Component Tests (18 tests)

Component tests verify structure, contracts, and data formatting. Full rendering tests use React Testing Library with mocked stores and services.

#### Dashboard.test.tsx (18 tests)
- Component fixture requirements
- Data contracts validation
- Portfolio summary formatting
- Health status color mapping
- Service integration points
- Navigation patterns

### 3. Integration Tests (17 tests)

Integration tests verify workflows across multiple services working together.

#### integration.test.ts (17 tests)

**Portfolio Analysis Workflow (3 tests)**
- Health and snapshot together
- Combine metrics with trends
- Validate metrics against portfolio

**Email Schedule Workflow (5 tests)**
- Create schedule and send test
- Update schedule and verify connection
- Fetch schedules and logs
- Monitor queue status
- Health indicators

**Metrics and Alerts Workflow (4 tests)**
- Create metric and set threshold
- Fetch and acknowledge alerts
- Update metric and track history

**Report Generation Workflow (3 tests)**
- Generate and manage cache
- Multiple report types
- History and downloads

**Error Recovery (2 tests)**
- Partial failures in parallel ops
- Retry on transient failures

## Mocking Strategy

### API Mocking
The `mockApi` object in `test/mocks/api.ts` provides vi.fn() implementations for all HTTP methods:
- `get()`
- `post()`
- `patch()`
- `put()`
- `delete()`

### Mock Data
Fixtures in `test/fixtures/data.ts` provide realistic mock responses for:
- `mockPortfolioSnapshot` - 3-property portfolio
- `mockPortfolioHealth` - Health score 78, status 'good'
- `mockEmailSchedule` - Weekly summary schedule
- `mockMetric` - Debt Service Coverage Ratio
- `mockMetricAlert` - Below-threshold alert
- `mockCacheStats` - Cache hit rate stats
- `mockReportResponse` - Successful report generation

### Store Mocking
Component tests use Vitest's vi.mock to provide:
- `usePortfolioStore()` - Portfolio summary and fetch
- `useAuthStore()` - Authentication state
- `useNavigate()` - Router navigation

## Test Patterns

### Service Testing Pattern
```typescript
// 1. Mock API response
mockApi.get.mockResolvedValue({ success: true, data: fixture });

// 2. Call service method
const result = await reportService.getPortfolioSnapshot('portfolio_1');

// 3. Verify API was called correctly
expect(mockApi.get).toHaveBeenCalledWith('/api/reports/portfolio/portfolio_1/snapshot');

// 4. Verify response structure
expect(result.snapshot.metrics.totalValue).toBe(1350000);
```

### Component Testing Pattern
```typescript
// 1. Mock dependencies
vi.mock('../../services/reportService', () => ({ ... }));
vi.mock('../../store/portfolioStore', () => ({ ... }));

// 2. Render component
renderDashboard();

// 3. Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Portfolio Health')).toBeInTheDocument();
});

// 4. Verify interactions
expect(mockNavigate).toHaveBeenCalledWith('/analytics');
```

### Integration Testing Pattern
```typescript
// 1. Mock API with sequential responses
mockApi.get
  .mockResolvedValueOnce({ /* health data */ })
  .mockResolvedValueOnce({ /* snapshot data */ });

// 2. Call services in workflow
const health = await reportService.getPortfolioHealth('portfolio_1');
const snapshot = await reportService.getPortfolioSnapshot('portfolio_1');

// 3. Verify workflow coordination
expect(health.health.score).toBe(78);
expect(snapshot.snapshot.metrics.totalValue).toBe(1350000);
```

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to `main`, `develop`, `claude/**` branches
- Pull requests to `main` or `develop`

**Workflow: `.github/workflows/frontend-tests.yml`**
- Runs on Node 18.x and 20.x
- Installs dependencies
- Runs linter (if configured)
- Executes all tests
- Generates coverage report
- Uploads to Codecov

### Local Pre-commit
Configure pre-commit hook to run tests:
```bash
#!/bin/sh
npm test -- --run
```

## Coverage Goals

Target coverage by category:
- **Services**: 90%+ (core business logic)
- **Components**: 80%+ (structure and contracts)
- **Integration**: 75%+ (workflow paths)
- **Overall**: 85%+

Current coverage can be viewed with:
```bash
npm test -- --coverage
open coverage/index.html
```

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert Pattern**
   ```typescript
   // Arrange
   mockApi.get.mockResolvedValue({ success: true, data: fixture });
   
   // Act
   const result = await service.method();
   
   // Assert
   expect(result).toBe(expected);
   ```

2. **Test Behavior, Not Implementation**
   - Test what the service returns, not how it works
   - Focus on API contracts
   - Verify error handling

3. **Use Descriptive Names**
   - `should generate report with correct parameters`
   - `should throw on API error`
   - `should return empty list when no schedules exist`

4. **Mock External Dependencies**
   - Always mock API calls
   - Mock stores for component tests
   - Mock router for navigation

5. **Keep Tests Isolated**
   - Use `beforeEach()` to reset mocks
   - Clear state between tests
   - Avoid test interdependencies

### Debugging Tests
```bash
# Run single test file
npm test -- src/services/__tests__/reportService.test.ts

# Run tests matching pattern
npm test -- --grep "getPortfolioHealth"

# Run with verbose output
npm test -- --reporter=verbose

# Debug in Node (with debugger)
node --inspect-brk ./node_modules/.bin/vitest
```

### Common Issues

**"Cannot access 'mockFn' before initialization"**
- Cause: vi.mock() is hoisted above variable declarations
- Fix: Define mocks inline in vi.mock factory or use separate setup file

**"fetch is not defined"**
- Cause: Fetch API not available in test environment
- Fix: Already mocked globally in `src/test/setup.ts`

**"localStorage is not defined"**
- Cause: localStorage not available in jsdom/happy-dom
- Fix: Already mocked globally in `src/test/setup.ts`

## Future Improvements

1. **E2E Tests** - Add Playwright tests for user workflows
2. **Visual Regression** - Integrate visual testing
3. **Performance Tests** - Add performance benchmarks
4. **Accessibility Tests** - Add a11y testing with jest-axe
5. **Snapshot Tests** - Add component snapshot tests
6. **Backend Integration** - Add API contract tests
7. **Load Testing** - Add stress testing for cache/queue operations

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
