# End-to-End Testing Guide

## Overview

This guide covers the Playwright-based end-to-end (E2E) testing infrastructure for the AI Real Estate Frontend. E2E tests verify critical user workflows across the entire application stack, ensuring the frontend, API integration, and business logic work together correctly.

## Test Statistics

**E2E Test Suites**: 4 core test files
- **auth.spec.ts**: 6 tests - Authentication flows (login, logout, signup)
- **portfolio.spec.ts**: 8 tests - Portfolio management and dashboard
- **property-search.spec.ts**: 10 tests - Property search and filtering
- **transactions.spec.ts**: 11 tests - Transaction management
- **Total**: 35+ E2E tests

## Prerequisites

### Environment Setup

```bash
# Install Playwright browsers (one-time setup)
npx playwright install

# Install dependencies
npm install

# Start dev server for tests to connect to
npm run dev
```

### Configuration Files

- **playwright.config.ts**: Main Playwright configuration
  - Base URL: `http://localhost:5173`
  - Browsers: Chromium, Firefox, WebKit
  - Test directory: `tests/e2e/`
  - Reporters: HTML, JSON, JUnit
  - Auto-starts dev server if not running

## Test Structure

### Directory Layout

```
src/frontend/
├── playwright.config.ts           # Playwright configuration
├── E2E_TESTING.md                # This file
└── tests/e2e/
    ├── auth.spec.ts              # Authentication tests (6 tests)
    ├── portfolio.spec.ts          # Portfolio tests (8 tests)
    ├── property-search.spec.ts    # Property search tests (10 tests)
    ├── transactions.spec.ts       # Transaction tests (11 tests)
    ├── pages/
    │   ├── BasePage.ts            # Base page object model
    │   ├── AuthPage.ts            # Login/signup page model
    │   ├── DashboardPage.ts       # Dashboard page model
    │   └── PropertyPage.ts        # Property search page model
    ├── fixtures/
    │   └── testData.ts            # Test data and mocks
    └── utils/
        └── testHelpers.ts         # Reusable test utilities
```

### Page Object Models

The page object model pattern encapsulates page interactions, making tests more maintainable and readable.

#### BasePage

Base class for all page objects with common functionality:

```typescript
class BasePage {
  navigate(path: string)           // Navigate to URL path
  waitForPageLoad()               // Wait for network idle
  isHeaderVisible()               // Check header visibility
  getPageTitle()                  // Get page title
  waitForElement(selector)        // Wait for element to appear
  clickElement(selector)          // Click element
  fillInput(selector, value)      // Fill form input
  getText(selector)               // Get text content
}
```

#### AuthPage

Handles login, signup, and authentication flows:

```typescript
class AuthPage extends BasePage {
  navigateToLogin()               // Go to login page
  navigateToSignup()              // Go to signup page
  login(email, password)          // Login with credentials
  signup(email, password)         // Create new account
  logout()                        // Logout current user
  isLoggedIn()                    // Check if user is authenticated
  getErrorMessage()               // Get error message text
}
```

#### DashboardPage

Manages dashboard interactions:

```typescript
class DashboardPage extends BasePage {
  navigateToDashboard()           // Go to dashboard
  isPortfolioSummaryVisible()     // Check summary visibility
  getTotalProperties()            // Get total property count
  getTotalValue()                 // Get portfolio value
  getCashFlow()                   // Get cash flow
  clickAddProperty()              // Click add property button
  getPropertyCount()              // Count visible properties
  searchProperties(query)         // Search property list
  openPropertyDetails(index)      // Open property details
}
```

#### PropertyPage

Handles property search and filtering:

```typescript
class PropertyPage extends BasePage {
  navigateToSearch()              // Go to property search
  navigateToFavorites()           // Go to favorites page
  searchByLocation(location)      // Search by location
  searchByPriceRange(min, max)    // Search by price range
  searchByBedrooms(count)         // Search by bedrooms
  getResultCount()                // Count search results
  addFirstPropertyToFavorites()   // Add property to favorites
  openPropertyDetails(index)      // Open property details
  getFavoritesCount()             // Count favorited properties
}
```

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run E2E Tests in UI Mode

Interactive test runner with visual debugging:

```bash
npm run test:e2e:ui
```

### Run E2E Tests with Debugger

Step through tests with Playwright Inspector:

```bash
npm run test:e2e:debug
```

### Run Specific Test File

```bash
npm run test:e2e -- auth.spec.ts
npm run test:e2e -- portfolio.spec.ts
npm run test:e2e -- property-search.spec.ts
npm run test:e2e -- transactions.spec.ts
```

### Run Specific Test

```bash
npm run test:e2e -- --grep "should login with valid credentials"
```

### Run Tests in Specific Browser

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

### Run Tests in Headed Mode

See browser while tests run:

```bash
npm run test:e2e -- --headed
```

### Run Tests with Video Recording

```bash
npm run test:e2e -- --video=on
```

## Test Coverage

### Authentication Flow Tests (auth.spec.ts)

**Test**: Login with valid credentials
- Navigate to login page
- Enter email and password
- Verify redirect to dashboard
- Verify user is logged in

**Test**: Display error for invalid credentials
- Navigate to login page
- Enter invalid credentials
- Verify error message appears
- Verify user stays on login page

**Test**: Require email and password
- Navigate to login page
- Try to submit without filling fields
- Verify validation errors

**Test**: Logout successfully
- Login user
- Click logout button
- Verify redirect to login
- Verify logout button is gone

**Test**: Prevent access to protected pages when not logged in
- Attempt to navigate to dashboard
- Verify redirect to login page

**Test**: Signup new user
- Navigate to signup page
- Enter new email and password
- Verify account creation and redirect

### Portfolio Management Tests (portfolio.spec.ts)

**Test**: Display portfolio summary
- Navigate to dashboard
- Verify summary cards visible
- Verify all metrics displayed

**Test**: Display portfolio metrics correctly
- Navigate to dashboard
- Verify total properties, value, and cash flow contain valid data

**Test**: Navigate to add property form
- Click add property button
- Verify navigation to add property page

**Test**: Display property list
- Navigate to dashboard
- Verify property list is rendered
- Count displayed properties

**Test**: Search properties on dashboard
- Search with specific criteria
- Verify results update

**Test**: Open property details
- Click on property in list
- Verify navigation to details page

**Test**: Show empty state when no properties
- When portfolio is empty
- Verify empty state message or add button

**Test**: Calculate portfolio summary
- With multiple properties
- Verify calculations are displayed correctly

### Property Search Tests (property-search.spec.ts)

**Test**: Navigate to search page
- Navigate to /properties/search
- Verify search UI is visible

**Test**: Search by location
- Enter location and search
- Verify results are returned

**Test**: Search by price range
- Enter min/max price and search
- Verify results are filtered

**Test**: Search by bedrooms
- Select bedrooms and search
- Verify results are filtered

**Test**: Display search results
- Perform search
- Verify result items are visible

**Test**: Add to favorites from search
- Search and add first result to favorites
- Verify count increases

**Test**: Open property details
- Click on search result
- Verify property details are displayed

**Test**: Navigate to favorites page
- Navigate to /properties/favorites
- Verify favorites page loads

**Test**: Display empty favorites
- When no favorites exist
- Verify empty state or count is 0

**Test**: Handle no results
- Search with criteria that returns no results
- Verify empty state is shown gracefully

**Test**: Support multiple filter combinations
- Apply multiple filters sequentially
- Verify results are cumulative

### Transaction Management Tests (transactions.spec.ts)

**Test**: Navigate to transactions page
- Navigate to /transactions
- Verify page loads

**Test**: Display transactions list
- View transactions page
- Verify list or empty state

**Test**: Add income transaction
- Fill income transaction form
- Submit and verify redirect

**Test**: Add expense transaction
- Fill expense transaction form
- Submit and verify redirect

**Test**: Display transaction details
- Click on transaction
- Verify details are shown

**Test**: Edit transaction
- Click edit on transaction
- Verify form is populated

**Test**: Delete transaction
- Click delete and confirm
- Verify transaction is removed

**Test**: Filter by category
- Select category filter
- Verify results update

**Test**: Filter by date range
- Set start and end dates
- Verify results update

**Test**: Display category totals
- View category summary
- Verify totals are calculated

## Test Helpers

### TestHelpers Utility Class

Common test operations:

```typescript
// Wait for navigation
await TestHelpers.waitForUrl(page, /dashboard/);

// Assertions
await TestHelpers.expectElementToHaveText(page, selector, text);
await TestHelpers.expectElementToBeVisible(page, selector);
await TestHelpers.expectElementToBeHidden(page, selector);

// Form interactions
await TestHelpers.fillFormField(page, 'Email', 'user@example.com');
await TestHelpers.selectDropdown(page, 'Category', 'rent');
await TestHelpers.clickButton(page, 'Login');

// Table operations
const rowCount = await TestHelpers.getTableRowCount(page, 'table');
const cellText = await TestHelpers.getTableCellText(page, 'table', 1, 2);

// Notifications
await TestHelpers.waitForNotification(page);
const message = await TestHelpers.getNotificationText(page);
await TestHelpers.dismissNotification(page);

// API mocking
await TestHelpers.mockAPIResponse(page, '/api/.*', { data: [] });

// UI interactions
await TestHelpers.scrollToElement(page, selector);
await TestHelpers.hoverElement(page, selector);
await TestHelpers.doubleClickElement(page, selector);
```

## Test Data

### Test Users

- **testUser**: Valid credentials for testing
  ```typescript
  {
    email: 'test.user@example.com',
    password: 'TestPassword123!'
  }
  ```

- **testUserNew**: Dynamic email for signup testing
  ```typescript
  {
    email: `test.user.${Date.now()}@example.com`,
    password: 'NewTestPassword123!'
  }
  ```

### Test Properties

Three sample properties with full details:
- Denver, CO - $450,000 - 3 bed/2 bath
- Boulder, CO - $550,000 - 4 bed/3 bath  
- Fort Collins, CO - $350,000 - 2 bed/1 bath

### Test Transactions

Three transaction types:
- Income: Rent payment ($2,500)
- Expense: Maintenance ($500)
- Expense: Insurance ($150)

### Search Filters

Pre-configured filter combinations:
- Price range: $300,000 - $600,000
- Location: Denver, CO
- Bedrooms: 3
- Bathrooms: 2

## Best Practices

### Writing Tests

1. **Clear Test Names**: Describe expected behavior
   ```typescript
   ✅ "should login with valid credentials"
   ❌ "test login"
   ```

2. **Page Object Pattern**: Use page objects for interactions
   ```typescript
   const authPage = new AuthPage(page);
   await authPage.login(email, password);
   ```

3. **Wait for State**: Always wait for page load or elements
   ```typescript
   await authPage.waitForPageLoad();
   await page.waitForSelector(selector);
   ```

4. **Test User Flows**: Focus on what users do
   - Login → View dashboard → Search → Add to favorites
   - Create property → View transactions → Export report

5. **Handle Optional Elements**: Some UI elements may not exist
   ```typescript
   if (await element.isVisible()) {
     await element.click();
   }
   ```

### Debugging Tests

1. **Use UI Mode**: Visual debugging with inspector
   ```bash
   npm run test:e2e:ui
   ```

2. **Use Debug Mode**: Step through with Playwright Inspector
   ```bash
   npm run test:e2e:debug
   ```

3. **Use Headed Mode**: See what browser is doing
   ```bash
   npm run test:e2e -- --headed
   ```

4. **Take Screenshots**: On failure or at key points
   ```typescript
   await page.screenshot({ path: 'screenshot.png' });
   ```

5. **Use Console Logs**: Debug information
   ```typescript
   console.log(await page.title());
   ```

## CI/CD Integration

### GitHub Actions Setup

E2E tests can be integrated into GitHub Actions workflow:

```yaml
- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: test-results/html
```

## Known Limitations

1. **Authentication**: Tests use hardcoded credentials. For production, use test database fixtures.

2. **API Mocking**: Some tests may require API mocking for unreliable endpoints.

3. **Flaky Tests**: Network delays or timing issues may cause intermittent failures.
   - Use `test.slow()` to increase timeout
   - Use `test.retry(n)` for automatic retries

4. **Cross-Browser**: Tests run on Chromium, Firefox, and WebKit by default.
   - Some features may not work consistently across browsers
   - Use browser-specific test cases if needed

## Performance Considerations

- Tests run in parallel by default (faster)
- Each test is independent and isolated
- Typical E2E test execution: 5-15 seconds per test
- Full suite execution: 2-3 minutes

## Future Improvements

### Phase 6 Enhancements

1. **Visual Regression Testing**: Screenshot comparisons
2. **Performance Testing**: Measure page load times
3. **Accessibility Testing**: WCAG compliance checks
4. **Mobile Testing**: Test on mobile breakpoints
5. **API Response Validation**: Mock and verify API responses
6. **Error Scenario Testing**: Network errors, timeouts, invalid data

### Advanced Features

1. **Test Data Cleanup**: Delete test data after tests
2. **Snapshot Testing**: Compare UI snapshots
3. **Load Testing**: Multiple concurrent users
4. **Session Recording**: Video of failures
5. **Custom Reporters**: Integration with test management systems

## Troubleshooting

### Tests Timeout

**Problem**: Tests take too long and timeout
**Solution**: 
- Increase timeout: `test.setTimeout(30000);`
- Check network connectivity
- Verify dev server is running

### Element Not Found

**Problem**: Selector doesn't match any element
**Solution**:
- Use `--ui` mode to inspect selectors
- Check if element is visible/in viewport
- Wait for element: `page.waitForSelector()`

### Navigation Not Working

**Problem**: Page doesn't navigate as expected
**Solution**:
- Verify baseURL in playwright.config.ts
- Check auth state is maintained
- Wait for page load: `page.waitForLoadState()`

### Flaky Tests

**Problem**: Tests pass sometimes, fail other times
**Solution**:
- Increase wait times
- Use `test.slow()` for slow tests
- Remove time-dependent assertions
- Use `test.retry(2)` for critical tests

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Useful Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# Run with debugger
npm run test:e2e:debug

# Run specific test file
npm run test:e2e -- auth.spec.ts

# Run tests matching pattern
npm run test:e2e -- --grep "login"

# Run single test
npm run test:e2e -- --grep "should login with valid credentials"

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run with video recording
npm run test:e2e -- --video=on

# Run on specific browser
npm run test:e2e -- --project=firefox

# Generate HTML report
npm run test:e2e -- --reporter=html
```

## Summary

The E2E testing infrastructure provides comprehensive coverage of critical user workflows:

✅ **35+ Tests** covering authentication, portfolio, search, and transactions
✅ **Page Object Models** for maintainable and readable tests
✅ **Test Utilities** for common operations
✅ **Multiple Browsers** (Chromium, Firefox, WebKit)
✅ **Multi-Reporter** support (HTML, JSON, JUnit)
✅ **Auto Dev Server** startup in config
✅ **CI/CD Ready** for GitHub Actions integration

Tests verify that users can successfully:
- Login/logout and manage authentication
- Create and view portfolios
- Search and filter properties
- Manage favorites and transactions
- View analytics and reports

Next phase: Add visual regression testing, performance monitoring, and mobile testing.
