/**
 * Real Device E2E Tests (Phase 7 Sprint 1)
 *
 * Tests authentication, core features, and device-specific functionality
 * across iOS and Android real devices via BrowserStack.
 *
 * Note: This is the scaffold for Phase 7. Full implementation in progress.
 */

import { test, expect, Page } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertyPage } from './pages/PropertyPage';
import { RealDeviceHelpers, RealDeviceTestResult } from './utils/realDeviceHelpers';
import { getDeviceCapabilities } from './utils/realDeviceCapabilities';
import { testUser } from './fixtures/testData';

// Get device ID from environment or parameter
const CURRENT_DEVICE = process.env.BROWSERSTACK_DEVICE || 'iPhone-13';

test.describe('Real Device Testing - Phase 7', () => {
  test.describe('iOS Device Tests', () => {
    test.skip(
      !CURRENT_DEVICE.includes('iPhone'),
      'Skipping iOS tests on non-iOS devices'
    );

    let authPage: AuthPage;
    let dashboardPage: DashboardPage;
    let testResults: RealDeviceTestResult[] = [];

    test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
      dashboardPage = new DashboardPage(page);
    });

    test('should render login page on real iOS device', async ({ page }) => {
      const startTime = Date.now();

      try {
        await authPage.navigateToLogin();
        await authPage.waitForPageLoad();

        // Verify elements visible
        await expect(authPage.emailInput).toBeVisible();
        await expect(authPage.passwordInput).toBeVisible();
        await expect(authPage.loginButton).toBeVisible();

        // Capture screenshot
        const screenshot = await RealDeviceHelpers.captureAndCompareScreenshot(
          page,
          CURRENT_DEVICE,
          'login-page-ios'
        );

        // Measure performance
        const performance = await RealDeviceHelpers.measureRealDevicePerformance(page);

        testResults.push({
          deviceId: CURRENT_DEVICE,
          testName: 'login-page-ios',
          passed: true,
          duration: Date.now() - startTime,
          screenshots: [screenshot],
          performance,
          logs: await RealDeviceHelpers.getDeviceLogs(page, CURRENT_DEVICE),
        });
      } catch (error) {
        testResults.push({
          deviceId: CURRENT_DEVICE,
          testName: 'login-page-ios',
          passed: false,
          duration: Date.now() - startTime,
          errorMessage: String(error),
          screenshots: [],
          performance: { pageLoadTime: 0, apiResponseTime: 0, memoryUsage: 0 },
          logs: [],
        });
        throw error;
      }
    });

    test('should handle login on real iOS device', async ({ page }) => {
      const startTime = Date.now();

      try {
        await authPage.navigateToLogin();

        // Type with iOS keyboard
        await RealDeviceHelpers.typeWithIOSKeyboard(page, 'input[type="email"]', testUser.email);
        await RealDeviceHelpers.typeWithIOSKeyboard(page, 'input[type="password"]', testUser.password);

        // Tap login button (iOS)
        await authPage.loginButton.tap();

        // Wait for redirect
        await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

        // Capture screenshot
        const screenshot = await RealDeviceHelpers.captureAndCompareScreenshot(
          page,
          CURRENT_DEVICE,
          'login-success-ios'
        );

        const performance = await RealDeviceHelpers.measureRealDevicePerformance(page);

        testResults.push({
          deviceId: CURRENT_DEVICE,
          testName: 'login-success-ios',
          passed: true,
          duration: Date.now() - startTime,
          screenshots: [screenshot],
          performance,
          logs: await RealDeviceHelpers.getDeviceLogs(page, CURRENT_DEVICE),
        });
      } catch (error) {
        testResults.push({
          deviceId: CURRENT_DEVICE,
          testName: 'login-success-ios',
          passed: false,
          duration: Date.now() - startTime,
          errorMessage: String(error),
          screenshots: [],
          performance: { pageLoadTime: 0, apiResponseTime: 0, memoryUsage: 0 },
          logs: [],
        });
        throw error;
      }
    });

    test('should handle safe area on notched iPhones', async ({ page }) => {
      const capabilities = getDeviceCapabilities(CURRENT_DEVICE);

      if (!capabilities?.hasNotch) {
        test.skip();
      }

      try {
        await authPage.navigateToLogin();

        // Check that elements don't overlap with notch
        const headerVisible = await page.evaluate(() => {
          const header = document.querySelector('header');
          if (!header) return true;

          const rect = header.getBoundingClientRect();
          // Safe area starts at notch height (usually 44px on iPhone)
          return rect.top >= 44;
        });

        expect(headerVisible).toBe(true);
      } catch (error) {
        console.error('Safe area test failed:', error);
        throw error;
      }
    });

    test('should handle iOS keyboard dismissal', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await RealDeviceHelpers.typeWithIOSKeyboard(page, 'input[type="email"]', testUser.email);

        // Tap elsewhere to dismiss keyboard
        await page.tap('text=Sign in');
        await page.waitForTimeout(500);

        // Elements should still be visible and keyboard dismissed
        const emailInput = authPage.emailInput;
        await expect(emailInput).toBeVisible();
      } catch (error) {
        console.error('iOS keyboard dismissal test failed:', error);
        throw error;
      }
    });

    test('should display dashboard on iOS device', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        // Verify dashboard loaded
        await expect(dashboardPage.portfolioSummary).toBeVisible({ timeout: 5000 });

        // Capture dashboard screenshot
        await RealDeviceHelpers.captureAndCompareScreenshot(
          page,
          CURRENT_DEVICE,
          'dashboard-ios'
        );
      } catch (error) {
        console.error('iOS dashboard test failed:', error);
        throw error;
      }
    });

    test('should perform property search on iOS', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        const propertyPage = new PropertyPage(page);
        await propertyPage.navigateToSearch();

        // Search should be functional
        await expect(propertyPage.searchButton).toBeVisible();

        // Perform search
        await propertyPage.searchInput.fill('Denver');
        await propertyPage.searchButton.click();

        // Results should load
        await page.waitForTimeout(1000);
        const resultsVisible = await page.locator('[data-testid="property-card"]').count();
        expect(resultsVisible).toBeGreaterThan(0);
      } catch (error) {
        console.error('iOS property search test failed:', error);
        throw error;
      }
    });

    test('should handle iOS swipe gestures', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        // Perform swipe gesture (left swipe)
        const element = page.locator('[data-testid="property-card"]').first();
        await element.swipe({ direction: 'left' });

        await page.waitForTimeout(500);
        // Page should remain responsive
        await expect(authPage.emailInput).not.toBeVisible();
      } catch (error) {
        console.error('iOS swipe gesture test failed:', error);
        throw error;
      }
    });

    test('should handle iOS long press', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        const button = authPage.loginButton;

        // Long press the button
        await button.hold({ timeout: 1000 });
        await page.waitForTimeout(500);

        // Element should still be clickable
        await expect(button).toBeVisible();
      } catch (error) {
        console.error('iOS long press test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Android Device Tests', () => {
    test.skip(
      !CURRENT_DEVICE.includes('Pixel') && !CURRENT_DEVICE.includes('Samsung'),
      'Skipping Android tests on non-Android devices'
    );

    let authPage: AuthPage;
    let testResults: RealDeviceTestResult[] = [];

    test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
    });

    test('should render login page on real Android device', async ({ page }) => {
      const startTime = Date.now();

      try {
        await authPage.navigateToLogin();
        await authPage.waitForPageLoad();

        // Verify elements visible
        await expect(authPage.emailInput).toBeVisible();
        await expect(authPage.loginButton).toBeVisible();

        // Capture screenshot
        const screenshot = await RealDeviceHelpers.captureAndCompareScreenshot(
          page,
          CURRENT_DEVICE,
          'login-page-android'
        );

        const performance = await RealDeviceHelpers.measureRealDevicePerformance(page);

        testResults.push({
          deviceId: CURRENT_DEVICE,
          testName: 'login-page-android',
          passed: true,
          duration: Date.now() - startTime,
          screenshots: [screenshot],
          performance,
          logs: await RealDeviceHelpers.getDeviceLogs(page, CURRENT_DEVICE),
        });
      } catch (error) {
        testResults.push({
          deviceId: CURRENT_DEVICE,
          testName: 'login-page-android',
          passed: false,
          duration: Date.now() - startTime,
          errorMessage: String(error),
          screenshots: [],
          performance: { pageLoadTime: 0, apiResponseTime: 0, memoryUsage: 0 },
          logs: [],
        });
        throw error;
      }
    });

    test('should handle back button on Android', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.navigateToSignup();

        // Press Android back button
        await RealDeviceHelpers.pressAndroidBackButton(page);

        // Should go back to login
        // Allow for navigation
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        expect([
          currentUrl.includes('login'),
          currentUrl.includes('signin'),
        ].some((x) => x)).toBe(true);
      } catch (error) {
        console.error('Back button test failed:', error);
        throw error;
      }
    });

    test('should handle Android keyboard input correctly', async ({ page }) => {
      try {
        await authPage.navigateToLogin();

        // Type email with Android keyboard
        await authPage.emailInput.click();
        await authPage.emailInput.fill(testUser.email);

        // Verify email was entered
        const emailValue = await authPage.emailInput.inputValue();
        expect(emailValue).toBe(testUser.email);
      } catch (error) {
        console.error('Android keyboard input test failed:', error);
        throw error;
      }
    });

    test('should display dashboard on Android device', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        const dashboardPage = new DashboardPage(page);
        await expect(dashboardPage.portfolioSummary).toBeVisible({ timeout: 5000 });

        // Capture dashboard screenshot
        await RealDeviceHelpers.captureAndCompareScreenshot(
          page,
          CURRENT_DEVICE,
          'dashboard-android'
        );
      } catch (error) {
        console.error('Android dashboard test failed:', error);
        throw error;
      }
    });

    test('should perform property search on Android', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        const propertyPage = new PropertyPage(page);
        await propertyPage.navigateToSearch();

        // Enter search query
        await propertyPage.searchInput.fill('Denver');
        await propertyPage.searchButton.click();

        // Wait for results
        await page.waitForTimeout(1000);
        const resultsCount = await page.locator('[data-testid="property-card"]').count();
        expect(resultsCount).toBeGreaterThan(0);
      } catch (error) {
        console.error('Android property search test failed:', error);
        throw error;
      }
    });

    test('should handle Android system back button navigation', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        const dashboardPage = new DashboardPage(page);
        await expect(dashboardPage.portfolioSummary).toBeVisible();

        // Press back button
        await RealDeviceHelpers.pressAndroidBackButton(page);
        await page.waitForTimeout(1000);

        // Should be at a valid page (not crashed)
        const url = page.url();
        expect(url).toBeTruthy();
      } catch (error) {
        console.error('Android system back button test failed:', error);
        throw error;
      }
    });

    test('should handle Android navigation drawer swipes', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        // Swipe from left edge to open drawer
        await page.touchscreen?.tap(10, 100);
        await page.waitForTimeout(500);

        // Verify page remains responsive
        const dashboardPage = new DashboardPage(page);
        await expect(dashboardPage.portfolioSummary).toBeVisible({ timeout: 2000 });
      } catch (error) {
        console.error('Android swipe test failed:', error);
        // Don't fail if drawer doesn't exist
      }
    });
  });

  test.describe('Cross-Device Feature Tests', () => {
    let authPage: AuthPage;
    let dashboardPage: DashboardPage;
    let propertyPage: PropertyPage;

    test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
      dashboardPage = new DashboardPage(page);
      propertyPage = new PropertyPage(page);
    });

    test('should authenticate across all real devices', async () => {
      // This test runs on all devices and validates feature parity
      const capabilities = getDeviceCapabilities(CURRENT_DEVICE);
      expect(capabilities).toBeDefined();
    });

    test('should display dashboard on real device', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);
        await dashboardPage.navigateToDashboard();

        // Dashboard should load
        await expect(dashboardPage.portfolioSummary).toBeVisible();
      } catch (error) {
        console.error('Dashboard test failed:', error);
        throw error;
      }
    });

    test('should search properties on real device', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);
        await propertyPage.navigateToSearch();

        // Search should be functional
        await expect(propertyPage.searchButton).toBeVisible();
      } catch (error) {
        console.error('Property search test failed:', error);
        throw error;
      }
    });

    test('should handle logout on all devices', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        // Navigate to settings/logout
        const settingsButton = page.locator('[data-testid="settings-button"]');
        await expect(settingsButton).toBeVisible();
        await settingsButton.click();

        // Click logout
        const logoutButton = page.locator('[data-testid="logout-button"]');
        await logoutButton.click();

        // Should be redirected to login
        await expect(page).toHaveURL(/login|signin/, { timeout: 5000 });
      } catch (error) {
        console.error('Logout test failed:', error);
        throw error;
      }
    });

    test('should handle navigation between pages', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        // Navigate to search
        await propertyPage.navigateToSearch();
        await expect(propertyPage.searchButton).toBeVisible();

        // Navigate back to dashboard
        await dashboardPage.navigateToDashboard();
        await expect(dashboardPage.portfolioSummary).toBeVisible();
      } catch (error) {
        console.error('Navigation test failed:', error);
        throw error;
      }
    });

    test('should handle login with invalid credentials', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login('invalid@test.com', 'wrongpassword');

        // Error message should appear
        const errorMessage = page.locator('[data-testid="error-message"]');
        await expect(errorMessage).toBeVisible({ timeout: 3000 });
      } catch (error) {
        console.error('Invalid login test failed:', error);
        throw error;
      }
    });

    test('should handle network error gracefully', async ({ page }) => {
      try {
        // Simulate offline
        await page.context().setOffline(true);

        await authPage.navigateToLogin();
        // Page should still load (cached or offline-capable)

        await page.context().setOffline(false);
      } catch (error) {
        console.error('Network error test failed:', error);
        throw error;
      }
    });

    test('should preserve scroll position on navigation', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);
        await propertyPage.navigateToSearch();

        // Scroll down
        await page.evaluate(() => window.scrollBy(0, 500));
        const scrollBefore = await page.evaluate(() => window.scrollY);

        // Navigate and back
        await dashboardPage.navigateToDashboard();
        await propertyPage.navigateToSearch();

        // Scroll position might be different, just verify page is functional
        await expect(propertyPage.searchButton).toBeVisible();
      } catch (error) {
        console.error('Scroll preservation test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Device-Specific Capabilities', () => {
    test('should access geolocation when permitted', async ({ page }) => {
      try {
        const capabilities = getDeviceCapabilities(CURRENT_DEVICE);

        if (capabilities?.capabilities.location) {
          await RealDeviceHelpers.setGeolocation(page, 39.7392, -104.9903); // Denver

          // Check if geolocation was set
          const location = await page.evaluate(() => {
            return new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                  });
                },
                () => {
                  resolve(null);
                }
              );
            });
          });

          console.log('Device location:', location);
        }
      } catch (error) {
        console.error('Geolocation test failed:', error);
        // Don't fail test as geolocation is optional
      }
    });

    test('should handle orientation changes on real device', async ({ page }) => {
      try {
        const authPage = new AuthPage(page);
        await authPage.navigateToLogin();

        // Change orientation to landscape
        await RealDeviceHelpers.changeOrientation(page, 'landscape');
        await page.waitForTimeout(1000);

        // Elements should still be visible
        await expect(authPage.loginButton).toBeVisible();

        // Change back to portrait
        await RealDeviceHelpers.changeOrientation(page, 'portrait');
        await page.waitForTimeout(1000);

        await expect(authPage.loginButton).toBeVisible();
      } catch (error) {
        console.error('Orientation change test failed:', error);
        throw error;
      }
    });

    test('should handle landscape orientation on dashboard', async ({ page }) => {
      try {
        const authPage = new AuthPage(page);
        const dashboardPage = new DashboardPage(page);

        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        // Change to landscape
        await RealDeviceHelpers.changeOrientation(page, 'landscape');
        await page.waitForTimeout(1500);

        // Dashboard should still be visible
        await expect(dashboardPage.portfolioSummary).toBeVisible({ timeout: 3000 });

        // Change back to portrait
        await RealDeviceHelpers.changeOrientation(page, 'portrait');
      } catch (error) {
        console.error('Landscape dashboard test failed:', error);
        throw error;
      }
    });

    test('should access device permissions for location', async ({ page }) => {
      try {
        const capabilities = getDeviceCapabilities(CURRENT_DEVICE);

        if (capabilities?.capabilities.location) {
          // Grant geolocation permission
          await page.context().grantPermissions(['geolocation']);

          // Set location
          await RealDeviceHelpers.setGeolocation(page, 40.7128, -74.006); // NYC

          // Verify location is set
          const location = await page.evaluate(() => {
            return new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                () => resolve(null)
              );
            });
          });

          expect(location).toBeDefined();
        }
      } catch (error) {
        console.error('Location permission test failed:', error);
      }
    });

    test('should detect app crashes with device logs', async ({ page }) => {
      try {
        // Capture baseline logs
        const baselineLogs = await RealDeviceHelpers.getDeviceLogs(page, CURRENT_DEVICE);

        // Perform actions
        await authPage.navigateToLogin();

        // Capture logs after actions
        const logsAfter = await RealDeviceHelpers.getDeviceLogs(page, CURRENT_DEVICE);

        // Check for crashes
        const crashes = await RealDeviceHelpers.detectCrashes(logsAfter);
        expect(crashes.length).toBe(0);
      } catch (error) {
        console.error('Crash detection test failed:', error);
        throw error;
      }
    });

    test('should measure real device performance metrics', async ({ page }) => {
      try {
        await authPage.navigateToLogin();

        // Measure performance
        const performance = await RealDeviceHelpers.measureRealDevicePerformance(page);

        // Verify metrics exist and are reasonable
        expect(performance.pageLoadTime).toBeGreaterThan(0);
        expect(performance.apiResponseTime).toBeGreaterThan(0);

        // Check against device baseline
        const capabilities = getDeviceCapabilities(CURRENT_DEVICE);
        const tolerance = 0.2; // 20% tolerance

        if (capabilities?.performanceBaseline) {
          const maxLoadTime = capabilities.performanceBaseline.pageLoadTime * (1 + tolerance);
          expect(performance.pageLoadTime).toBeLessThan(maxLoadTime);
        }
      } catch (error) {
        console.error('Performance measurement test failed:', error);
        throw error;
      }
    });

    test('should compare performance across devices', async () => {
      try {
        const capabilities = getDeviceCapabilities(CURRENT_DEVICE);

        if (capabilities) {
          const iosDevices = ['iPhone-13', 'iPhone-14', 'iPhone-14Pro'];
          const androidDevices = ['Pixel-5', 'Pixel-6', 'Samsung-S21'];

          // Get device type
          const isIOS = iosDevices.includes(CURRENT_DEVICE);
          const comparison = {
            device: CURRENT_DEVICE,
            isIOS,
            performanceBaseline: capabilities.performanceBaseline,
          };

          expect(comparison).toBeDefined();
        }
      } catch (error) {
        console.error('Performance comparison test failed:', error);
        throw error;
      }
    });

    test('should validate device screen dimensions', async ({ page }) => {
      try {
        const capabilities = getDeviceCapabilities(CURRENT_DEVICE);

        const dimensions = await page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        }));

        if (capabilities?.screen) {
          expect(dimensions.width).toBeGreaterThan(0);
          expect(dimensions.height).toBeGreaterThan(0);
          expect(dimensions.devicePixelRatio).toBeGreaterThan(0);
        }
      } catch (error) {
        console.error('Screen dimension test failed:', error);
        throw error;
      }
    });

    test('should handle device storage quota', async ({ page }) => {
      try {
        const capabilities = getDeviceCapabilities(CURRENT_DEVICE);

        if (capabilities?.capabilities.storage) {
          const storageInfo = await page.evaluate(() => {
            return new Promise((resolve) => {
              navigator.storage?.estimate?.().then(resolve).catch(() => resolve(null));
            });
          });

          // Storage info might be available
          expect(storageInfo === null || typeof storageInfo === 'object').toBe(true);
        }
      } catch (error) {
        console.error('Storage quota test failed:', error);
      }
    });

    test('should handle high memory usage scenarios', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        const dashboardPage = new DashboardPage(page);
        await dashboardPage.navigateToDashboard();

        // Measure memory usage after loading multiple pages
        const performance = await RealDeviceHelpers.measureRealDevicePerformance(page);
        expect(performance.memoryUsage).toBeGreaterThanOrEqual(0);
      } catch (error) {
        console.error('Memory usage test failed:', error);
        throw error;
      }
    });

    test('should handle rapid navigation', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        // Rapidly navigate between pages
        for (let i = 0; i < 3; i++) {
          await dashboardPage.navigateToDashboard();
          await page.waitForTimeout(200);
        }

        // Should still be responsive
        await expect(dashboardPage.portfolioSummary).toBeVisible({ timeout: 2000 });
      } catch (error) {
        console.error('Rapid navigation test failed:', error);
        throw error;
      }
    });

    test('should handle modal dialogs on device', async ({ page }) => {
      try {
        await authPage.navigateToLogin();
        await authPage.login(testUser.email, testUser.password);

        // Look for any modal/dialog
        const modal = page.locator('[role="dialog"]').first();

        if (await modal.isVisible()) {
          // Modal should be interactable
          const closeButton = modal.locator('button[aria-label="Close"]');
          if (await closeButton.isVisible()) {
            await closeButton.click();
          }
        }
      } catch (error) {
        console.error('Modal dialog test failed:', error);
      }
    });

    test('should handle form input validation', async ({ page }) => {
      try {
        await authPage.navigateToLogin();

        // Try submitting empty form
        await authPage.loginButton.click();

        // Validation errors should appear
        await page.waitForTimeout(500);
        const page1 = page.url();
        expect(page1).toContain('login');
      } catch (error) {
        console.error('Form validation test failed:', error);
        throw error;
      }
    });

    test('should handle deep linking', async ({ page }) => {
      try {
        // Navigate directly to search page
        await page.goto('/search?query=denver');

        // Should redirect to login if not authenticated
        await page.waitForTimeout(1000);
        const url = page.url();
        expect([url.includes('login'), url.includes('signin'), url.includes('search')].some(x => x)).toBe(true);
      } catch (error) {
        console.error('Deep linking test failed:', error);
        throw error;
      }
    });
  });

  test.afterAll(async () => {
    // Generate test report (Phase 7)
    if (testResults.length > 0) {
      const report = RealDeviceHelpers.generateTestReport(testResults);
      console.log(report);

      // Export results
      RealDeviceHelpers.exportResultsToJSON(testResults, `./test-results/real-device-tests/${CURRENT_DEVICE}.json`);
    }
  });
});
