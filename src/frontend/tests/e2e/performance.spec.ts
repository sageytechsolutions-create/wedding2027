import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertyPage } from './pages/PropertyPage';
import { PerformanceHelpers } from './utils/performanceHelpers';
import { testUser } from './fixtures/testData';

test.describe('Performance Testing', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let propertyPage: PropertyPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    propertyPage = new PropertyPage(page);
  });

  test.describe('Page Load Performance', () => {
    test('login page should load within acceptable time', async () => {
      const loadTime = await PerformanceHelpers.measureLoadTime(authPage.page, '/login');

      expect(loadTime).toBeLessThan(3000); // Should load in less than 3 seconds
      console.log(`Login page load time: ${PerformanceHelpers.formatMilliseconds(loadTime)}`);
    });

    test('dashboard should load within acceptable time', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);

      const loadTime = await PerformanceHelpers.measureLoadTime(dashboardPage.page, '/dashboard');

      expect(loadTime).toBeLessThan(5000); // Should load in less than 5 seconds
      console.log(`Dashboard load time: ${PerformanceHelpers.formatMilliseconds(loadTime)}`);
    });

    test('property search should load within acceptable time', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);

      const loadTime = await PerformanceHelpers.measureLoadTime(propertyPage.page, '/properties/search');

      expect(loadTime).toBeLessThan(5000); // Should load in less than 5 seconds
      console.log(`Property search load time: ${PerformanceHelpers.formatMilliseconds(loadTime)}`);
    });
  });

  test.describe('Page Metrics', () => {
    test('login page should have good performance metrics', async () => {
      await authPage.navigateToLogin();
      const metrics = await PerformanceHelpers.getPageMetrics(authPage.page);

      expect(metrics.pageLoadTime).toBeLessThan(3000);
      expect(metrics.firstContentfulPaint).toBeLessThan(1500);

      const report = PerformanceHelpers.generatePerformanceReport(
        metrics,
        await PerformanceHelpers.getResourceMetrics(authPage.page)
      );
      console.log(report);
    });

    test('dashboard should have good performance metrics', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const metrics = await PerformanceHelpers.getPageMetrics(dashboardPage.page);
      const resources = await PerformanceHelpers.getResourceMetrics(dashboardPage.page);

      expect(metrics.pageLoadTime).toBeLessThan(5000);
      expect(metrics.firstContentfulPaint).toBeLessThan(2500);
      expect(resources.totalSize).toBeLessThan(5000000); // Less than 5MB

      const report = PerformanceHelpers.generatePerformanceReport(metrics, resources);
      console.log(report);
    });

    test('property search should have good performance metrics', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await propertyPage.navigateToSearch();

      const metrics = await PerformanceHelpers.getPageMetrics(propertyPage.page);
      const resources = await PerformanceHelpers.getResourceMetrics(propertyPage.page);

      expect(metrics.pageLoadTime).toBeLessThan(5000);
      expect(resources.scriptSize).toBeLessThan(2000000); // Less than 2MB for scripts

      const report = PerformanceHelpers.generatePerformanceReport(metrics, resources);
      console.log(report);
    });
  });

  test.describe('Resource Metrics', () => {
    test('should minimize number of HTTP requests', async () => {
      await authPage.navigateToLogin();
      const resources = await PerformanceHelpers.getResourceMetrics(authPage.page);

      // Login page should not have excessive requests
      expect(resources.totalRequests).toBeLessThan(50);
      console.log(`Total requests on login page: ${resources.totalRequests}`);
    });

    test('should optimize image sizes', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const resources = await PerformanceHelpers.getResourceMetrics(dashboardPage.page);

      // Images should be reasonably sized
      console.log(`Image size on dashboard: ${PerformanceHelpers.formatBytes(resources.imageSize)}`);
      expect(resources.imageSize).toBeLessThan(2000000); // Less than 2MB for images
    });

    test('should optimize JavaScript bundle size', async () => {
      await authPage.navigateToLogin();
      const resources = await PerformanceHelpers.getResourceMetrics(authPage.page);

      console.log(`Script size on login page: ${PerformanceHelpers.formatBytes(resources.scriptSize)}`);
      expect(resources.scriptSize).toBeLessThan(1500000); // Less than 1.5MB for scripts
    });

    test('should optimize CSS bundle size', async () => {
      await authPage.navigateToLogin();
      const resources = await PerformanceHelpers.getResourceMetrics(authPage.page);

      console.log(`Style size on login page: ${PerformanceHelpers.formatBytes(resources.styleSize)}`);
      expect(resources.styleSize).toBeLessThan(500000); // Less than 500KB for styles
    });
  });

  test.describe('API Response Times', () => {
    test('API calls should respond quickly', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      // Wait a bit for API calls to complete
      await dashboardPage.page.waitForTimeout(2000);

      const apiTimings = await PerformanceHelpers.measureApiResponseTime(dashboardPage.page);

      if (apiTimings.length > 0) {
        for (const timing of apiTimings) {
          expect(timing.time).toBeLessThan(5000); // API calls should respond in less than 5 seconds
          console.log(`API response time for ${timing.endpoint}: ${PerformanceHelpers.formatMilliseconds(timing.time)}`);
        }
      }
    });
  });

  test.describe('JavaScript Errors', () => {
    test('should not have JavaScript errors on login page', async () => {
      await authPage.navigateToLogin();
      const errors = await PerformanceHelpers.checkJavaScriptErrors(authPage.page);

      expect(errors).toHaveLength(0);
    });

    test('should not have JavaScript errors on dashboard', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const errors = await PerformanceHelpers.checkJavaScriptErrors(dashboardPage.page);

      if (errors.length > 0) {
        console.log('JavaScript errors found:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    test('should not have JavaScript errors on property search', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await propertyPage.navigateToSearch();

      const errors = await PerformanceHelpers.checkJavaScriptErrors(propertyPage.page);

      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Web Vitals', () => {
    test('should have acceptable Core Web Vitals on dashboard', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      // Give page time to settle
      await dashboardPage.page.waitForTimeout(2000);

      // Note: Real Core Web Vitals measurement requires PerformanceObserver
      // This is a simplified version
      const metrics = await PerformanceHelpers.getPageMetrics(dashboardPage.page);

      // LCP (Largest Contentful Paint) should be < 2.5s
      expect(metrics.largestContentfulPaint).toBeLessThan(2500);

      // FID equivalent (check for no page jank)
      expect(metrics.timeToInteractive).toBeLessThan(5000);

      console.log(`LCP: ${PerformanceHelpers.formatMilliseconds(metrics.largestContentfulPaint)}`);
      console.log(`TTI: ${PerformanceHelpers.formatMilliseconds(metrics.timeToInteractive)}`);
    });
  });

  test.describe('Performance Regression Detection', () => {
    test('should maintain acceptable performance across multiple page views', async () => {
      await authPage.navigateToLogin();

      const times: number[] = [];

      // Navigate to login multiple times
      for (let i = 0; i < 3; i++) {
        const time = await PerformanceHelpers.measureLoadTime(authPage.page, '/login');
        times.push(time);
      }

      // Check that performance is consistent (not degrading)
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxDeviation = Math.max(...times.map((t) => Math.abs(t - avgTime)));

      expect(maxDeviation).toBeLessThan(500); // No single measurement more than 500ms from average
      console.log(`Average load time: ${PerformanceHelpers.formatMilliseconds(avgTime)}`);
      console.log(`Load times: ${times.map((t) => PerformanceHelpers.formatMilliseconds(t)).join(', ')}`);
    });
  });
});
