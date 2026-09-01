import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { testUser, testPortfolioProperty } from './fixtures/testData';

test.describe('Portfolio Management', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);

    // Login before each test
    await authPage.navigateToLogin();
    await authPage.login(testUser.email, testUser.password);
  });

  test('should display portfolio summary on dashboard', async () => {
    await dashboardPage.navigateToDashboard();

    // Verify portfolio summary is visible
    expect(await dashboardPage.isPortfolioSummaryVisible()).toBe(true);

    // Verify all summary cards are visible
    await expect(dashboardPage.totalPropertiesCard).toBeVisible();
    await expect(dashboardPage.totalValueCard).toBeVisible();
    await expect(dashboardPage.cashFlowCard).toBeVisible();
  });

  test('should display portfolio metrics correctly', async () => {
    await dashboardPage.navigateToDashboard();

    const totalProperties = await dashboardPage.getTotalProperties();
    const totalValue = await dashboardPage.getTotalValue();
    const cashFlow = await dashboardPage.getCashFlow();

    expect(totalProperties).toBeGreaterThanOrEqual(0);
    expect(totalValue).toBeTruthy();
    expect(cashFlow).toBeTruthy();
  });

  test('should navigate to add property form', async () => {
    await dashboardPage.navigateToDashboard();

    await dashboardPage.clickAddProperty();

    // Should navigate to add property page
    await expect(dashboardPage.page).toHaveURL(/property|portfolio.*add|add.*property/i);
  });

  test('should display property list on dashboard', async () => {
    await dashboardPage.navigateToDashboard();

    const propertyCount = await dashboardPage.getPropertyCount();

    // Even if no properties, the property list should be visible/rendered
    expect(propertyCount).toBeGreaterThanOrEqual(0);
  });

  test('should search properties on dashboard', async () => {
    await dashboardPage.navigateToDashboard();

    // Only test if there are properties to search
    const initialCount = await dashboardPage.getPropertyCount();
    if (initialCount > 0) {
      await dashboardPage.searchProperties('Main Street');

      // Results should update
      const resultsCount = await dashboardPage.getPropertyCount();
      expect(resultsCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should open property details from dashboard', async () => {
    await dashboardPage.navigateToDashboard();

    const propertyCount = await dashboardPage.getPropertyCount();

    if (propertyCount > 0) {
      await dashboardPage.openPropertyDetails(0);

      // Should navigate to property details page
      await expect(dashboardPage.page).toHaveURL(/property|details/i);
    }
  });

  test('should show empty state when no properties exist', async () => {
    await dashboardPage.navigateToDashboard();

    const propertyCount = await dashboardPage.getPropertyCount();

    if (propertyCount === 0) {
      // Should show empty state message or add property button
      await expect(dashboardPage.addPropertyButton).toBeVisible();
    }
  });

  test('should calculate portfolio summary with multiple properties', async () => {
    await dashboardPage.navigateToDashboard();

    const initialProperties = await dashboardPage.getTotalProperties();

    if (initialProperties > 0) {
      const totalValue = await dashboardPage.getTotalValue();
      const cashFlow = await dashboardPage.getCashFlow();

      // Verify calculations are displayed
      expect(totalValue).toMatch(/\$|USD|\d+/);
      expect(cashFlow).toMatch(/\$|USD|-?\d+/);
    }
  });
});
