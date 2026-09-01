/**
 * Real Device Testing Helpers
 * Utilities for testing on real iOS and Android devices via BrowserStack
 */

import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface DeviceScreenshot {
  deviceId: string;
  testName: string;
  timestamp: number;
  actualPath: string;
  baselinePath: string;
  diffPath?: string;
  matches: boolean;
  diffPercentage: number;
}

export interface RealDeviceTestResult {
  deviceId: string;
  testName: string;
  passed: boolean;
  duration: number;
  errorMessage?: string;
  screenshots: DeviceScreenshot[];
  performance: {
    pageLoadTime: number;
    apiResponseTime: number;
    memoryUsage: number;
  };
  logs: string[];
}

export interface CrashReport {
  deviceId: string;
  timestamp: number;
  crashType: string;
  stackTrace: string;
  appState?: string;
}

export class RealDeviceHelpers {
  /**
   * Capture screenshot and compare with baseline
   */
  static async captureAndCompareScreenshot(
    page: Page,
    deviceId: string,
    testName: string,
    options?: {
      tolerance?: number;
      maxDiffPixels?: number;
      updateBaseline?: boolean;
    }
  ): Promise<DeviceScreenshot> {
    const screenshotName = `${testName}-${deviceId}.png`;
    const actualPath = path.join('./src/frontend/tests/e2e/screenshots/actual/real-devices', screenshotName);
    const baselinePath = path.join('./src/frontend/tests/e2e/screenshots/baseline/real-devices', screenshotName);
    const diffPath = path.join('./src/frontend/tests/e2e/screenshots/diff/real-devices', screenshotName);

    // Ensure directories exist
    this.ensureDirectories([
      path.dirname(actualPath),
      path.dirname(baselinePath),
      path.dirname(diffPath),
    ]);

    // Take screenshot
    await page.screenshot({ path: actualPath, fullPage: true });

    // Compare with baseline if it exists
    let matches = false;
    let diffPercentage = 0;

    if (fs.existsSync(baselinePath) && !options?.updateBaseline) {
      try {
        // Use Playwright's built-in comparison
        await expect(page).toHaveScreenshot(screenshotName, {
          maxDiffPixels: options?.maxDiffPixels || 100,
          threshold: options?.tolerance || 0.05,
        });
        matches = true;
      } catch (error) {
        matches = false;
        // Calculate approximate diff percentage
        diffPercentage = this.calculateDiffPercentage(actualPath, baselinePath);
      }
    } else if (options?.updateBaseline) {
      // Copy actual to baseline for first-time baseline creation
      fs.copyFileSync(actualPath, baselinePath);
      matches = true;
    }

    return {
      deviceId,
      testName,
      timestamp: Date.now(),
      actualPath,
      baselinePath,
      diffPath: fs.existsSync(diffPath) ? diffPath : undefined,
      matches,
      diffPercentage,
    };
  }

  /**
   * Get device logs (requires BrowserStack session)
   */
  static async getDeviceLogs(page: Page, deviceId: string): Promise<string[]> {
    const logs: string[] = [];

    // Capture console logs
    page.on('console', (msg) => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture network logs
    page.on('response', (response) => {
      logs.push(`[network] ${response.status()} ${response.url()}`);
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      logs.push(`[error] ${error.message}`);
    });

    return logs;
  }

  /**
   * Check for crashes in device logs
   */
  static async detectCrashes(page: Page, deviceId: string): Promise<CrashReport[]> {
    const crashes: CrashReport[] = [];
    const logs = await this.getDeviceLogs(page, deviceId);

    const crashPatterns = [
      /fatal|crash|exception|segmentation fault/i,
      /uncaught.*error/i,
      /out of memory/i,
      /killed by signal/i,
    ];

    logs.forEach((log) => {
      crashPatterns.forEach((pattern) => {
        if (pattern.test(log)) {
          crashes.push({
            deviceId,
            timestamp: Date.now(),
            crashType: 'App Crash',
            stackTrace: log,
          });
        }
      });
    });

    return crashes;
  }

  /**
   * Measure performance on real device
   */
  static async measureRealDevicePerformance(page: Page): Promise<{
    pageLoadTime: number;
    apiResponseTime: number;
    memoryUsage: number;
  }> {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const apiResources = resources.filter((r) => r.name.includes('/api/'));
      const avgApiTime = apiResources.length > 0
        ? apiResources.reduce((sum, r) => sum + r.duration, 0) / apiResources.length
        : 0;

      return {
        pageLoadTime: navigation?.loadEventEnd - navigation?.fetchStart || 0,
        apiResponseTime: avgApiTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize / 1048576 || 0, // MB
      };
    });

    return metrics;
  }

  /**
   * Test native keyboard input on iOS
   */
  static async typeWithIOSKeyboard(page: Page, selector: string, text: string): Promise<void> {
    const input = page.locator(selector);
    await input.focus();

    // iOS keyboard typing
    for (const char of text) {
      await input.press('a'); // Simulate keypress
      await page.waitForTimeout(50);
    }

    // Set actual value
    await input.fill(text);

    // Dismiss keyboard
    await page.evaluate(() => {
      const focusedElement = document.activeElement as HTMLElement;
      focusedElement?.blur();
    });
  }

  /**
   * Handle Android back button
   */
  static async pressAndroidBackButton(page: Page): Promise<void> {
    // Press Escape key (maps to back button on Android)
    await page.press('body', 'Escape');
    await page.waitForTimeout(300);
  }

  /**
   * Simulate geolocation on real device
   */
  static async setGeolocation(page: Page, latitude: number, longitude: number, accuracy: number = 100): Promise<void> {
    await page.context().setGeolocation({ latitude, longitude });
    await page.context().grantPermissions(['geolocation']);
  }

  /**
   * Simulate device orientation change
   */
  static async changeOrientation(page: Page, orientation: 'portrait' | 'landscape'): Promise<void> {
    // This requires device-specific handling in BrowserStack
    await page.evaluate((orient) => {
      window.dispatchEvent(
        new Event('orientationchange', {
          bubbles: true,
        })
      );
    }, orientation);

    // Simulate viewport change
    if (orientation === 'landscape') {
      await page.setViewportSize({ width: 1024, height: 768 });
    } else {
      await page.setViewportSize({ width: 768, height: 1024 });
    }

    await page.waitForTimeout(500); // Let page adjust
  }

  /**
   * Generate test result report
   */
  static generateTestReport(results: RealDeviceTestResult[]): string {
    const timestamp = new Date().toISOString();
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    let report = `
# Real Device Test Report
Generated: ${timestamp}

## Summary
- Total Tests: ${totalTests}
- Passed: ${passedTests} ✅
- Failed: ${failedTests} ❌
- Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%
- Average Duration: ${avgDuration.toFixed(2)}s

## Test Results
`;

    results.forEach((result) => {
      report += `
### ${result.testName} on ${result.deviceId}
- Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- Duration: ${result.duration}ms
- Screenshots: ${result.screenshots.length}
${result.errorMessage ? `- Error: ${result.errorMessage}` : ''}
- Performance:
  - Page Load: ${result.performance.pageLoadTime}ms
  - API Response: ${result.performance.apiResponseTime}ms
  - Memory: ${result.performance.memoryUsage}MB
`;
    });

    return report;
  }

  /**
   * Compare performance across devices
   */
  static comparePerformanceAcrossDevices(results: RealDeviceTestResult[]): string {
    const report = `
# Performance Comparison Across Devices

`;

    const byDevice = results.reduce(
      (acc, r) => {
        if (!acc[r.deviceId]) {
          acc[r.deviceId] = [];
        }
        acc[r.deviceId].push(r);
        return acc;
      },
      {} as Record<string, RealDeviceTestResult[]>
    );

    for (const [deviceId, deviceResults] of Object.entries(byDevice)) {
      const avgPageLoad = deviceResults.reduce((sum, r) => sum + r.performance.pageLoadTime, 0) / deviceResults.length;
      const avgApiResponse = deviceResults.reduce((sum, r) => sum + r.performance.apiResponseTime, 0) / deviceResults.length;
      const avgMemory = deviceResults.reduce((sum, r) => sum + r.performance.memoryUsage, 0) / deviceResults.length;

      report += `
## ${deviceId}
- Average Page Load: ${avgPageLoad.toFixed(0)}ms
- Average API Response: ${avgApiResponse.toFixed(0)}ms
- Average Memory: ${avgMemory.toFixed(0)}MB
- Tests: ${deviceResults.length}
- Success Rate: ${((deviceResults.filter((r) => r.passed).length / deviceResults.length) * 100).toFixed(2)}%
`;
    }

    return report;
  }

  /**
   * Helper: Ensure directories exist
   */
  private static ensureDirectories(dirs: string[]): void {
    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Helper: Calculate diff percentage between two images (simplified)
   */
  private static calculateDiffPercentage(actualPath: string, baselinePath: string): number {
    try {
      const actualSize = fs.statSync(actualPath).size;
      const baselineSize = fs.statSync(baselinePath).size;
      const diff = Math.abs(actualSize - baselineSize);
      return (diff / Math.max(actualSize, baselineSize)) * 100;
    } catch {
      return 0;
    }
  }

  /**
   * Export test results to JSON
   */
  static exportResultsToJSON(results: RealDeviceTestResult[], outputPath: string): void {
    const data = JSON.stringify(results, null, 2);
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, data);
  }

  /**
   * Upload results to dashboard (placeholder for Phase 7)
   */
  static async uploadResultsToDashboard(results: RealDeviceTestResult[], dashboardUrl: string): Promise<void> {
    // This will be implemented in Phase 7 when dashboard is ready
    console.log(`[Phase 7] Would upload ${results.length} test results to dashboard`);
  }
}
