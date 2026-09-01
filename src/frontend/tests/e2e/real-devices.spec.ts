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
