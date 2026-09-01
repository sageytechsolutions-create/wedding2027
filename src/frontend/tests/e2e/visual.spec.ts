import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertyPage } from './pages/PropertyPage';
import { testUser } from './fixtures/testData';

test.describe('Visual Regression Tests', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let propertyPage: PropertyPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    propertyPage = new PropertyPage(page);
  });

  test.describe('Authentication Pages', () => {
    test('should render login page consistently', async () => {
      await authPage.navigateToLogin();
      await authPage.waitForPageLoad();

      await expect(authPage.page).toHaveScreenshot('login-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should render signup page consistently', async () => {
      await authPage.navigateToSignup();
      await authPage.waitForPageLoad();

      await expect(authPage.page).toHaveScreenshot('signup-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should render login error state consistently', async () => {
      await authPage.navigateToLogin();
      await authPage.emailInput.fill('invalid@example.com');
      await authPage.passwordInput.fill('WrongPassword123!');
      await authPage.loginButton.click();

      // Wait for error to appear
      await authPage.errorMessage.waitFor({ state: 'visible', timeout: 5000 });

      await expect(authPage.page).toHaveScreenshot('login-error-state.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });

  test.describe('Dashboard Pages', () => {
    test.beforeEach(async () => {
      // Login before each dashboard test
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
    });

    test('should render dashboard consistently', async () => {
      await dashboardPage.navigateToDashboard();
      await dashboardPage.waitForPageLoad();

      await expect(dashboardPage.page).toHaveScreenshot('dashboard-page.png', {
        maxDiffPixels: 150,
        threshold: 0.2,
      });
    });

    test('should render portfolio summary consistently', async () => {
      await dashboardPage.navigateToDashboard();
      await dashboardPage.portfolioSummary.waitFor({ state: 'visible' });

      await expect(dashboardPage.portfolioSummary).toHaveScreenshot('portfolio-summary.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should render property list consistently', async () => {
      await dashboardPage.navigateToDashboard();

      const propertyCount = await dashboardPage.getPropertyCount();

      if (propertyCount > 0) {
        await expect(dashboardPage.propertyList).toHaveScreenshot('property-list.png', {
          maxDiffPixels: 100,
          threshold: 0.2,
        });
      }
    });

    test('should render empty portfolio state consistently', async () => {
      await dashboardPage.navigateToDashboard();

      const propertyCount = await dashboardPage.getPropertyCount();

      if (propertyCount === 0) {
        await expect(dashboardPage.addPropertyButton).toHaveScreenshot('empty-portfolio-state.png', {
          maxDiffPixels: 100,
          threshold: 0.2,
        });
      }
    });
  });

  test.describe('Property Search Pages', () => {
    test.beforeEach(async () => {
      // Login before each search test
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
    });

    test('should render property search page consistently', async () => {
      await propertyPage.navigateToSearch();
      await propertyPage.waitForPageLoad();

      await expect(propertyPage.page).toHaveScreenshot('property-search-page.png', {
        maxDiffPixels: 150,
        threshold: 0.2,
      });
    });

    test('should render search filters consistently', async () => {
      await propertyPage.navigateToSearch();

      // Wait for filters to be visible
      await propertyPage.searchButton.waitFor({ state: 'visible' });

      const filterArea = propertyPage.page.locator('form, [data-testid="search-filters"]').first();

      if (await filterArea.isVisible()) {
        await expect(filterArea).toHaveScreenshot('search-filters.png', {
          maxDiffPixels: 100,
          threshold: 0.2,
        });
      }
    });

    test('should render search results consistently', async () => {
      await propertyPage.navigateToSearch();
      await propertyPage.searchByLocation('Denver');

      const resultCount = await propertyPage.getResultCount();

      if (resultCount > 0) {
        await expect(propertyPage.propertyResults).toHaveScreenshot('search-results.png', {
          maxDiffPixels: 150,
          threshold: 0.2,
        });
      }
    });

    test('should render empty search results consistently', async () => {
      await propertyPage.navigateToSearch();
      await propertyPage.searchByLocation('NonExistentCity99999');

      const resultCount = await propertyPage.getResultCount();

      if (resultCount === 0) {
        const emptyState = propertyPage.page.locator('[data-testid="empty-state"], .empty-state').first();

        if (await emptyState.isVisible()) {
          await expect(emptyState).toHaveScreenshot('empty-search-results.png', {
            maxDiffPixels: 100,
            threshold: 0.2,
          });
        }
      }
    });

    test('should render favorites page consistently', async () => {
      await propertyPage.navigateToFavorites();
      await propertyPage.waitForPageLoad();

      await expect(propertyPage.page).toHaveScreenshot('favorites-page.png', {
        maxDiffPixels: 150,
        threshold: 0.2,
      });
    });
  });

  test.describe('Responsive Design Snapshots', () => {
    test('should render login page on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const authPageMobile = new AuthPage(page);

      await authPageMobile.navigateToLogin();
      await authPageMobile.waitForPageLoad();

      await expect(page).toHaveScreenshot('login-mobile.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should render dashboard on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const authPageMobile = new AuthPage(page);
      const dashboardMobile = new DashboardPage(page);

      await authPageMobile.navigateToLogin();
      await authPageMobile.login(testUser.email, testUser.password);
      await dashboardMobile.navigateToDashboard();

      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should render property search on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const authPageTablet = new AuthPage(page);
      const propertyPageTablet = new PropertyPage(page);

      await authPageTablet.navigateToLogin();
      await authPageTablet.login(testUser.email, testUser.password);
      await propertyPageTablet.navigateToSearch();

      await expect(page).toHaveScreenshot('property-search-tablet.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });

  test.describe('Component Snapshots', () => {
    test.beforeEach(async () => {
      // Login before each component test
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
    });

    test('should render header consistently', async () => {
      await dashboardPage.navigateToDashboard();

      await expect(dashboardPage.header).toHaveScreenshot('header-component.png', {
        maxDiffPixels: 50,
        threshold: 0.2,
      });
    });

    test('should render navigation consistently', async () => {
      await dashboardPage.navigateToDashboard();

      if (await dashboardPage.navigation.isVisible()) {
        await expect(dashboardPage.navigation).toHaveScreenshot('navigation-component.png', {
          maxDiffPixels: 50,
          threshold: 0.2,
        });
      }
    });

    test('should render summary card consistently', async () => {
      await dashboardPage.navigateToDashboard();

      if (await dashboardPage.totalPropertiesCard.isVisible()) {
        await expect(dashboardPage.totalPropertiesCard).toHaveScreenshot('summary-card.png', {
          maxDiffPixels: 50,
          threshold: 0.2,
        });
      }
    });
  });

  test.describe('Error States Visual Regression', () => {
    test('should render 404 error page consistently', async ({ page }) => {
      await page.goto('/nonexistent-page', { waitUntil: 'load' }).catch(() => {
        // Ignore navigation errors
      });

      // Take screenshot of whatever is displayed
      await expect(page).toHaveScreenshot('404-error-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });

    test('should render unauthorized page consistently', async ({ page }) => {
      // Try to access protected resource without auth
      await page.goto('/api/protected', { waitUntil: 'load' }).catch(() => {
        // Ignore navigation errors
      });

      await expect(page).toHaveScreenshot('unauthorized-page.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      });
    });
  });
});
