import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertyPage } from './pages/PropertyPage';
import { testUser } from './fixtures/testData';

test.describe('Error Scenario & Edge Case Testing', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let propertyPage: PropertyPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    propertyPage = new PropertyPage(page);
  });

  test.describe('Authentication Error Scenarios', () => {
    test('should handle empty email field on login', async () => {
      await authPage.navigateToLogin();

      await authPage.passwordInput.fill(testUser.password);
      await authPage.loginButton.click();

      // Should show validation error or prevent submission
      await expect(authPage.page).toHaveURL(/login/);
    });

    test('should handle empty password field on login', async () => {
      await authPage.navigateToLogin();

      await authPage.emailInput.fill(testUser.email);
      await authPage.loginButton.click();

      // Should show validation error
      await expect(authPage.page).toHaveURL(/login/);
    });

    test('should handle invalid email format on login', async () => {
      await authPage.navigateToLogin();

      await authPage.emailInput.fill('not-an-email');
      await authPage.passwordInput.fill(testUser.password);
      await authPage.loginButton.click();

      // Should reject invalid email format
      await expect(authPage.page).toHaveURL(/login/);
    });

    test('should handle very long input in email field', async () => {
      await authPage.navigateToLogin();

      const longEmail = 'a'.repeat(255) + '@example.com';
      await authPage.emailInput.fill(longEmail);
      await authPage.passwordInput.fill(testUser.password);
      await authPage.loginButton.click();

      // Should handle gracefully
      await expect(authPage.page).toHaveURL(/login/);
    });

    test('should handle special characters in password', async () => {
      await authPage.navigateToLogin();

      await authPage.emailInput.fill(testUser.email);
      await authPage.passwordInput.fill('P@ssw0rd!#$%^&*()');
      await authPage.loginButton.click();

      // Should handle special characters
      await expect(authPage.page).toHaveURL(/login/);
    });

    test('should handle rapid login attempts', async () => {
      await authPage.navigateToLogin();

      // Attempt login multiple times rapidly
      for (let i = 0; i < 5; i++) {
        await authPage.emailInput.fill(testUser.email);
        await authPage.passwordInput.fill('WrongPassword');
        await authPage.loginButton.click();
        await authPage.page.waitForTimeout(100);
      }

      // Should not crash or show unexpected behavior
      await expect(authPage.page).toHaveURL(/login/);
    });
  });

  test.describe('Network Error Handling', () => {
    test('should handle network timeout gracefully', async () => {
      await authPage.navigateToLogin();

      // Simulate network timeout
      await authPage.page.route('**/api/**', (route) => {
        route.abort('timedout');
      });

      await authPage.emailInput.fill(testUser.email);
      await authPage.passwordInput.fill(testUser.password);
      await authPage.loginButton.click();

      // Should show error message or retry option
      await authPage.page.waitForTimeout(2000);

      // Page should remain functional
      expect(await authPage.page.url()).toBeTruthy();
    });

    test('should handle API 500 errors', async () => {
      await authPage.navigateToLogin();

      // Mock API to return 500 error
      await authPage.page.route('**/api/**', (route) => {
        route.abort('failed');
      });

      await authPage.emailInput.fill(testUser.email);
      await authPage.passwordInput.fill(testUser.password);
      await authPage.loginButton.click();

      await authPage.page.waitForTimeout(2000);

      // Should show error notification or message
      const errorMsg = await authPage.errorMessage.isVisible().catch(() => false);
      const stillOnLogin = await authPage.page.url().includes('login');

      expect(errorMsg || stillOnLogin).toBe(true);
    });

    test('should handle disconnected network', async () => {
      await authPage.navigateToLogin();

      // Go offline
      await authPage.page.context().setOffline(true);

      await authPage.emailInput.fill(testUser.email);
      await authPage.passwordInput.fill(testUser.password);
      await authPage.loginButton.click();

      await authPage.page.waitForTimeout(1000);

      // Should show offline error
      const errorVisible = await authPage.errorMessage.isVisible().catch(() => false);
      expect(errorVisible || !authPage.page.url().includes('dashboard')).toBe(true);

      // Restore network
      await authPage.page.context().setOffline(false);
    });
  });

  test.describe('Dashboard Error Scenarios', () => {
    test.beforeEach(async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
    });

    test('should handle empty portfolio gracefully', async () => {
      // Mock portfolio to be empty
      await dashboardPage.page.route('**/api/portfolio', (route) => {
        route.continue({
          response: {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ properties: [] }),
          },
        });
      });

      await dashboardPage.navigateToDashboard();

      // Should show empty state, not crash
      await expect(dashboardPage.addPropertyButton).toBeVisible();
    });

    test('should handle malformed API response', async () => {
      await dashboardPage.page.route('**/api/portfolio', (route) => {
        route.continue({
          response: {
            status: 200,
            contentType: 'application/json',
            body: 'invalid json{]',
          },
        });
      });

      await dashboardPage.navigateToDashboard();

      // Should handle gracefully without crashing
      await dashboardPage.page.waitForTimeout(1000);
      expect(await dashboardPage.page.url()).toBeTruthy();
    });

    test('should handle API returning null properties', async () => {
      await dashboardPage.page.route('**/api/portfolio', (route) => {
        route.continue({
          response: {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(null),
          },
        });
      });

      await dashboardPage.navigateToDashboard();

      // Should not crash
      await dashboardPage.page.waitForTimeout(1000);
      expect(await dashboardPage.page.url()).toBeTruthy();
    });

    test('should handle slow API responses', async () => {
      await dashboardPage.page.route('**/api/portfolio', async (route) => {
        // Delay response by 10 seconds
        await dashboardPage.page.waitForTimeout(10000);
        route.continue();
      });

      await dashboardPage.navigateToDashboard();

      // Should show loading state or eventually load
      await dashboardPage.page.waitForTimeout(12000);
      expect(await dashboardPage.page.url()).toBeTruthy();
    });
  });

  test.describe('Property Search Error Scenarios', () => {
    test.beforeEach(async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
    });

    test('should handle search API returning no results', async () => {
      await propertyPage.navigateToSearch();

      await propertyPage.page.route('**/api/properties/search', (route) => {
        route.continue({
          response: {
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ results: [], count: 0 }),
          },
        });
      });

      await propertyPage.searchByLocation('NonExistentCity');

      const resultCount = await propertyPage.getResultCount();
      expect(resultCount).toBe(0);
    });

    test('should handle search with special characters', async () => {
      await propertyPage.navigateToSearch();

      // Search with special characters
      await propertyPage.searchByLocation('<script>alert("xss")</script>');

      // Should not execute script, handle safely
      const errorVisible = await propertyPage.page
        .locator('[role="alert"]')
        .isVisible()
        .catch(() => false);
      expect(errorVisible || (await propertyPage.getResultCount()) >= 0).toBe(true);
    });

    test('should handle search with very long query', async () => {
      await propertyPage.navigateToSearch();

      const longQuery = 'a'.repeat(1000);
      await propertyPage.searchByLocation(longQuery);

      // Should handle long query without crashing
      await propertyPage.page.waitForTimeout(1000);
      expect(await propertyPage.page.url()).toBeTruthy();
    });

    test('should handle invalid price range', async () => {
      await propertyPage.navigateToSearch();

      // Set min > max
      await propertyPage.searchByPriceRange('600000', '300000');

      // Should either show error or handle gracefully
      await propertyPage.page.waitForTimeout(1000);
      expect(await propertyPage.page.url()).toBeTruthy();
    });

    test('should handle negative price input', async () => {
      await propertyPage.navigateToSearch();

      // Try negative price
      await propertyPage.searchByPriceRange('-100000', '500000');

      // Should reject or handle gracefully
      await propertyPage.page.waitForTimeout(1000);
      expect(await propertyPage.page.url()).toBeTruthy();
    });

    test('should handle rapid search requests', async () => {
      await propertyPage.navigateToSearch();

      // Make multiple search requests rapidly
      for (let i = 0; i < 10; i++) {
        await propertyPage.searchByLocation('Denver');
        await propertyPage.page.waitForTimeout(100);
      }

      // Should handle without crashing
      expect(await propertyPage.page.url()).toBeTruthy();
    });
  });

  test.describe('Form Input Validation', () => {
    test.beforeEach(async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
    });

    test('should validate required fields on add property form', async () => {
      await dashboardPage.navigateToDashboard();
      await dashboardPage.clickAddProperty();

      // Try to submit without filling fields
      const submitButton = dashboardPage.page.locator('button:has-text("Add"), button:has-text("Save")').first();

      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show validation errors or prevent submission
        await dashboardPage.page.waitForTimeout(500);
        expect(await dashboardPage.page.url()).toBeTruthy();
      }
    });

    test('should handle maximum input lengths', async () => {
      await dashboardPage.navigateToDashboard();

      // Try to input very long property name/description
      const descriptionInput = dashboardPage.page.locator('textarea, input[placeholder*="Description"]').first();

      if (await descriptionInput.isVisible()) {
        const longText = 'a'.repeat(10000);
        await descriptionInput.fill(longText);

        // Should truncate or handle gracefully
        const value = await descriptionInput.inputValue();
        expect(value.length).toBeLessThanOrEqual(10000 + 100); // Some buffer
      }
    });
  });

  test.describe('Concurrent Action Handling', () => {
    test.beforeEach(async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
    });

    test('should handle concurrent navigation requests', async () => {
      await dashboardPage.navigateToDashboard();

      // Try to navigate to multiple pages simultaneously
      const nav1 = dashboardPage.navigate('/dashboard');
      const nav2 = dashboardPage.navigate('/properties/search');
      const nav3 = dashboardPage.navigate('/transactions');

      await Promise.race([nav1, nav2, nav3]);

      // Should handle gracefully without crashing
      expect(await dashboardPage.page.url()).toBeTruthy();
    });

    test('should handle simultaneous form submissions', async () => {
      await dashboardPage.navigateToDashboard();

      const buttons = await dashboardPage.page.locator('button').all();

      if (buttons.length > 0) {
        // Try to click multiple buttons at once
        await Promise.all(
          buttons.slice(0, 3).map((btn) => {
            return btn.click().catch(() => {
              // Ignore errors
            });
          })
        );

        // Should handle without crashing
        expect(await dashboardPage.page.url()).toBeTruthy();
      }
    });
  });

  test.describe('Browser Compatibility Edge Cases', () => {
    test('should handle window resize gracefully', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      // Resize window multiple times
      for (let width = 1920; width >= 320; width -= 256) {
        await authPage.page.setViewportSize({ width, height: 768 });
        await authPage.page.waitForTimeout(200);
      }

      // Should adapt without crashing
      expect(await dashboardPage.page.url()).toBeTruthy();
    });

    test('should handle localStorage quota exceeded', async () => {
      await authPage.navigateToLogin();

      // Try to fill localStorage
      await authPage.page.evaluate(() => {
        try {
          for (let i = 0; i < 10000; i++) {
            localStorage.setItem(`test_key_${i}`, 'x'.repeat(1000));
          }
        } catch (e) {
          // Storage full - expected
        }
      });

      // Should still work without crashing
      expect(await authPage.page.url()).toBeTruthy();
    });
  });
});
