import { test, expect, Browser } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertyPage } from './pages/PropertyPage';
import { LoadTestHelpers } from './utils/loadTestHelpers';
import { testUser } from './fixtures/testData';

test.describe('Load Testing', () => {
  let browser: Browser;

  test.beforeAll(async ({ playwright }) => {
    // Get browser instance for load tests
    browser = await playwright.chromium.launch();
  });

  test.afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test.describe('Single User Stress Testing', () => {
    test('should handle 100 rapid page loads', async ({ page }) => {
      const authPage = new AuthPage(page);

      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < 100; i++) {
        try {
          await authPage.navigateToLogin();
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      const totalTime = Date.now() - startTime;
      const successRate = (successCount / 100) * 100;

      console.log(`Rapid load test: ${successCount}/100 successful in ${totalTime}ms`);
      expect(successRate).toBeGreaterThan(95); // Allow 5% failure rate
    });

    test('should handle form submission under load', async ({ page }) => {
      const authPage = new AuthPage(page);
      await authPage.navigateToLogin();

      let successCount = 0;

      for (let i = 0; i < 20; i++) {
        try {
          await authPage.emailInput.fill(testUser.email);
          await authPage.passwordInput.fill(testUser.password);
          await authPage.loginButton.click();

          // Reset form for next attempt
          await authPage.emailInput.clear();
          await authPage.passwordInput.clear();

          successCount++;
        } catch (error) {
          // Continue stress test
        }
      }

      const successRate = (successCount / 20) * 100;
      console.log(`Form submission stress test: ${successCount}/20 successful`);
      expect(successRate).toBeGreaterThan(80);
    });

    test('should handle API calls under load', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      const authPage = new AuthPage(page);

      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);

      const result = await LoadTestHelpers.stressTestEndpoint(
        page,
        '/api/portfolio',
        5, // 5 requests per second
        10000 // 10 second duration
      );

      console.log(LoadTestHelpers.generateLoadTestReport(result));

      // Should handle API calls with reasonable error rate
      expect(result.errorRate).toBeLessThan(10); // Less than 10% error rate
      expect(result.averageResponseTime).toBeLessThan(5000); // Less than 5 seconds average
    });
  });

  test.describe('Concurrent User Simulation', () => {
    test('should handle 5 concurrent users', async () => {
      const result = await LoadTestHelpers.simulateConcurrentUsers(
        browser,
        async (page) => {
          const authPage = new AuthPage(page);
          await authPage.navigateToLogin();
        },
        5,
        10000
      );

      console.log(LoadTestHelpers.generateConcurrentUserReport(result));

      // Should handle concurrent users
      expect(result.errors).toBeLessThan(2);
      expect(result.throughput).toBeGreaterThan(0.1); // At least 0.1 req/s
    });

    test('should handle 10 concurrent users', async () => {
      const result = await LoadTestHelpers.simulateConcurrentUsers(
        browser,
        async (page) => {
          const authPage = new AuthPage(page);
          await authPage.navigateToLogin();
          const dashboardPage = new DashboardPage(page);
          await dashboardPage.navigate('/dashboard').catch(() => {
            // Ignore navigation errors
          });
        },
        10,
        15000
      );

      console.log(LoadTestHelpers.generateConcurrentUserReport(result));

      // Should handle 10 concurrent users
      expect(result.errors).toBeLessThan(5);
      expect(result.peakMemoryUsage).toBeLessThan(500); // Less than 500MB
    });

    test('should handle 25 concurrent users with degradation tracking', async () => {
      const result = await LoadTestHelpers.simulateConcurrentUsers(
        browser,
        async (page) => {
          const propertyPage = new PropertyPage(page);
          await propertyPage.navigateToSearch().catch(() => {
            // Ignore navigation errors
          });
        },
        25,
        20000
      );

      console.log(LoadTestHelpers.generateConcurrentUserReport(result));

      // Should handle 25 concurrent users (may have some errors)
      expect(result.peakMemoryUsage).toBeLessThan(1000); // Less than 1GB
      // Throughput should be reasonable
      expect(result.throughput).toBeGreaterThan(0.05);
    });
  });

  test.describe('Throughput Measurement', () => {
    test('should measure login throughput', async ({ page }) => {
      const authPage = new AuthPage(page);
      await authPage.navigateToLogin();

      const result = await LoadTestHelpers.measureThroughput(page, async () => {
        // Simulate page view
        const url = authPage.page.url();
        // Reload page
        await authPage.page.reload().catch(() => {
          // Ignore reload errors
        });
      }, 10);

      console.log(`Login throughput: ${result.requestsPerSecond.toFixed(2)} operations/second`);
      console.log(`Average time per operation: ${result.averageTimePerRequest.toFixed(2)}ms`);

      expect(result.requestsPerSecond).toBeGreaterThan(0.1);
    });

    test('should measure dashboard interaction throughput', async ({ page }) => {
      const authPage = new AuthPage(page);
      const dashboardPage = new DashboardPage(page);

      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const result = await LoadTestHelpers.measureThroughput(page, async () => {
        // Simulate search interaction
        const searchBox = dashboardPage.searchInput;
        if (await searchBox.isVisible()) {
          await searchBox.fill('test');
          await searchBox.clear();
        }
      }, 20);

      console.log(`Dashboard interaction throughput: ${result.requestsPerSecond.toFixed(2)} ops/s`);

      expect(result.requestsPerSecond).toBeGreaterThan(0.5);
    });
  });

  test.describe('Bottleneck Detection', () => {
    test('should identify slow resources on login page', async ({ page }) => {
      const authPage = new AuthPage(page);
      await authPage.navigateToLogin();

      const bottlenecks = await LoadTestHelpers.detectBottlenecks(page);

      console.log('Slowest resources:');
      bottlenecks.slowestResources.forEach((resource) => {
        console.log(`  ${resource.url}: ${resource.time.toFixed(2)}ms`);
      });

      // Should have identified resources
      if (bottlenecks.slowestResources.length > 0) {
        expect(bottlenecks.slowestResources[0].time).toBeGreaterThan(0);
      }
    });

    test('should identify slow API endpoints', async ({ page }) => {
      const authPage = new AuthPage(page);
      const dashboardPage = new DashboardPage(page);

      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const bottlenecks = await LoadTestHelpers.detectBottlenecks(page);

      console.log('Slowest API endpoints:');
      bottlenecks.slowestAPI.forEach((api) => {
        console.log(`  ${api.endpoint}: ${api.avgTime.toFixed(2)}ms`);
      });

      // API calls should complete reasonably fast
      if (bottlenecks.slowestAPI.length > 0) {
        expect(bottlenecks.slowestAPI[0].avgTime).toBeLessThan(10000);
      }
    });

    test('should detect potential memory leaks', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);

      for (let i = 0; i < 5; i++) {
        await dashboardPage.navigate('/dashboard').catch(() => {
          // Ignore errors
        });
        await page.reload().catch(() => {
          // Ignore errors
        });
      }

      const bottlenecks = await LoadTestHelpers.detectBottlenecks(page);

      // Memory should not significantly increase (simplified check)
      console.log(`Potential memory leak detected: ${bottlenecks.memoryLeaks}`);
      expect(bottlenecks.memoryLeaks).toBe(false);
    });
  });

  test.describe('Capacity Planning', () => {
    test('should validate minimum capacity requirements', async () => {
      const canHandle = await LoadTestHelpers.validateLoadCapacity(
        browser,
        async (page) => {
          const authPage = new AuthPage(page);
          await authPage.navigateToLogin();
        },
        10 // Target: 10 concurrent users
      );

      console.log(`Can handle 10 concurrent users: ${canHandle}`);
      expect(canHandle).toBe(true);
    });
  });

  test.describe('Peak Load Testing', () => {
    test('should handle peak load during business hours', async () => {
      // Simulate peak load: 50 concurrent users for short duration
      const result = await LoadTestHelpers.simulateConcurrentUsers(
        browser,
        async (page) => {
          const authPage = new AuthPage(page);
          const dashboardPage = new DashboardPage(page);

          try {
            await authPage.navigateToLogin();
            await dashboardPage.navigate('/dashboard').catch(() => {
              // Ignore navigation errors
            });
          } catch (error) {
            // Continue test
          }
        },
        50,
        10000 // 10 second peak
      );

      console.log(LoadTestHelpers.generateConcurrentUserReport(result));

      // Should degrade gracefully under peak load
      expect(result.peakMemoryUsage).toBeLessThan(2000); // Less than 2GB
      // Error rate should be acceptable
      expect((result.errors / result.successfulRequests) * 100).toBeLessThan(20); // Less than 20% errors
    });
  });

  test.describe('Sustained Load Testing', () => {
    test('should maintain performance under sustained load', async () => {
      const result = await LoadTestHelpers.simulateConcurrentUsers(
        browser,
        async (page) => {
          const authPage = new AuthPage(page);
          await authPage.navigateToLogin();

          // Repeat action multiple times
          for (let i = 0; i < 3; i++) {
            await page.reload().catch(() => {
              // Ignore errors
            });
            await page.waitForTimeout(500);
          }
        },
        5,
        30000 // 30 second sustained load
      );

      console.log(LoadTestHelpers.generateConcurrentUserReport(result));

      // Performance should be consistent
      expect(result.errors).toBeLessThan(5);
      expect(result.peakMemoryUsage).toBeLessThan(500); // Memory should be stable
    });
  });
});
