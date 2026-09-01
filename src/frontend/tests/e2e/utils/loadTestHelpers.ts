import { Page, Browser, BrowserContext } from '@playwright/test';

export interface LoadTestResult {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
}

export interface ConcurrentUserResult {
  duration: number; // milliseconds
  averageResponseTime: number;
  maxResponseTime: number;
  errors: number;
  successfulRequests: number;
  throughput: number;
  peakMemoryUsage: number;
}

export class LoadTestHelpers {
  static async simulateConcurrentUsers(
    browser: Browser,
    action: (page: Page) => Promise<void>,
    concurrentUsers: number,
    duration: number = 30000 // 30 seconds
  ): Promise<ConcurrentUserResult> {
    const startTime = Date.now();
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const responseTimes: number[] = [];
    let errors = 0;
    let successfulRequests = 0;

    try {
      // Create multiple concurrent browser contexts/pages
      for (let i = 0; i < concurrentUsers; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Track network timing
        page.on('response', (response) => {
          const timing = response.timing();
          if (timing) {
            responseTimes.push(timing.responseEnd - timing.requestStart);
            successfulRequests++;
          }
        });

        page.on('requestfailed', () => {
          errors++;
        });

        contexts.push(context);
        pages.push(page);
      }

      // Run action on all pages concurrently
      const promises = pages.map((page) =>
        action(page).catch((error) => {
          console.error('User action failed:', error);
          errors++;
        })
      );

      // Wait for all to complete or timeout
      await Promise.race([
        Promise.all(promises),
        new Promise((resolve) => setTimeout(resolve, duration)),
      ]);

      // Collect memory usage
      const memUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

      // Calculate statistics
      const totalTime = Date.now() - startTime;
      const averageResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b) / responseTimes.length : 0;
      const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
      const throughput = successfulRequests / (totalTime / 1000);

      return {
        duration: totalTime,
        averageResponseTime,
        maxResponseTime,
        errors,
        successfulRequests,
        throughput,
        peakMemoryUsage: memUsage,
      };
    } finally {
      // Cleanup
      for (const page of pages) {
        await page.close();
      }
      for (const context of contexts) {
        await context.close();
      }
    }
  }

  static async stressTestEndpoint(
    page: Page,
    endpoint: string,
    requestsPerSecond: number = 10,
    duration: number = 30000
  ): Promise<LoadTestResult> {
    const startTime = Date.now();
    const responseTimes: number[] = [];
    let successCount = 0;
    let failureCount = 0;
    let totalRequests = 0;

    // Track all requests/responses
    page.on('response', (response) => {
      if (response.url().includes(endpoint)) {
        const timing = response.timing();
        if (timing) {
          responseTimes.push(timing.responseEnd - timing.requestStart);
          successCount++;
        }
        totalRequests++;
      }
    });

    page.on('requestfailed', (request) => {
      if (request.url().includes(endpoint)) {
        failureCount++;
        totalRequests++;
      }
    });

    // Simulate requests at specified rate
    const interval = 1000 / requestsPerSecond;
    const startRequestTime = Date.now();

    while (Date.now() - startRequestTime < duration) {
      try {
        await page.goto(endpoint, { waitUntil: 'domcontentloaded' }).catch(() => {
          // Ignore navigation errors
        });
        await page.waitForTimeout(interval);
      } catch (error) {
        // Continue with stress test
      }
    }

    // Calculate statistics
    const totalDuration = Date.now() - startTime;
    const responseTimes_sorted = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes_sorted.length * 0.95);
    const p99Index = Math.floor(responseTimes_sorted.length * 0.99);

    return {
      totalRequests,
      successCount,
      failureCount,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      p95ResponseTime: responseTimes_sorted[p95Index] || 0,
      p99ResponseTime: responseTimes_sorted[p99Index] || 0,
      throughput: totalRequests / (totalDuration / 1000),
      errorRate: totalRequests > 0 ? (failureCount / totalRequests) * 100 : 0,
    };
  }

  static async measureThroughput(
    page: Page,
    action: () => Promise<void>,
    numberOfIterations: number
  ): Promise<{
    totalTime: number;
    requestsPerSecond: number;
    averageTimePerRequest: number;
  }> {
    const startTime = Date.now();

    for (let i = 0; i < numberOfIterations; i++) {
      await action();
    }

    const totalTime = Date.now() - startTime;
    const requestsPerSecond = (numberOfIterations / totalTime) * 1000;
    const averageTimePerRequest = totalTime / numberOfIterations;

    return {
      totalTime,
      requestsPerSecond,
      averageTimePerRequest,
    };
  }

  static async detectBottlenecks(page: Page): Promise<{
    slowestResources: Array<{ url: string; time: number }>;
    slowestAPI: Array<{ endpoint: string; avgTime: number }>;
    memoryLeaks: boolean;
  }> {
    const resourceTiming = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources
        .map((r) => ({
          url: r.name,
          time: r.duration,
        }))
        .sort((a, b) => b.time - a.time)
        .slice(0, 5);
    });

    // Aggregate API call times
    const apiCalls = resourceTiming.filter((r) => r.url.includes('/api/'));
    const apiAggregated = apiCalls.reduce(
      (acc, curr) => {
        const endpoint = curr.url.split('?')[0];
        const existing = acc.find((a) => a.endpoint === endpoint);
        if (existing) {
          existing.times.push(curr.time);
        } else {
          acc.push({ endpoint, times: [curr.time] });
        }
        return acc;
      },
      [] as Array<{ endpoint: string; times: number[] }>
    );

    const slowestAPI = apiAggregated.map((a) => ({
      endpoint: a.endpoint,
      avgTime: a.times.reduce((x, y) => x + y) / a.times.length,
    }));

    // Check for memory leaks (simplified)
    const initialMemory = process.memoryUsage().heapUsed;
    await page.waitForTimeout(1000);
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncreased = finalMemory > initialMemory * 1.1; // 10% increase is suspicious

    return {
      slowestResources: resourceTiming,
      slowestAPI: slowestAPI.sort((a, b) => b.avgTime - a.avgTime).slice(0, 5),
      memoryLeaks: memoryIncreased,
    };
  }

  static generateLoadTestReport(result: LoadTestResult): string {
    return `
Load Test Report
================

Total Requests:       ${result.totalRequests}
Successful:           ${result.successCount}
Failed:               ${result.failureCount}
Error Rate:           ${result.errorRate.toFixed(2)}%

Response Times:
  Average:            ${result.averageResponseTime.toFixed(2)}ms
  Min:                ${result.minResponseTime.toFixed(2)}ms
  Max:                ${result.maxResponseTime.toFixed(2)}ms
  P95:                ${result.p95ResponseTime.toFixed(2)}ms
  P99:                ${result.p99ResponseTime.toFixed(2)}ms

Throughput:           ${result.throughput.toFixed(2)} req/s
    `;
  }

  static generateConcurrentUserReport(result: ConcurrentUserResult): string {
    return `
Concurrent User Test Report
============================

Test Duration:        ${result.duration}ms
Concurrent Users:     ${result.successfulRequests} successful
Errors:               ${result.errors}
Peak Memory:          ${result.peakMemoryUsage.toFixed(2)}MB

Performance:
  Average Response:   ${result.averageResponseTime.toFixed(2)}ms
  Max Response:       ${result.maxResponseTime.toFixed(2)}ms
  Throughput:         ${result.throughput.toFixed(2)} req/s
    `;
  }

  static async validateLoadCapacity(
    browser: Browser,
    action: (page: Page) => Promise<void>,
    targetUsersPerSecond: number
  ): Promise<boolean> {
    // Test increasing user load until throughput degrades
    const startingUsers = 10;
    let currentUsers = startingUsers;
    let lastThroughput = 0;
    let degradation = 0;

    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await this.simulateConcurrentUsers(browser, action, currentUsers, 10000);

      if (result.throughput < lastThroughput) {
        degradation++;
      }

      if (degradation > 1) {
        // Throughput degrading, capacity reached
        return currentUsers >= targetUsersPerSecond;
      }

      lastThroughput = result.throughput;
      currentUsers += 10;
    }

    return currentUsers >= targetUsersPerSecond;
  }
}
