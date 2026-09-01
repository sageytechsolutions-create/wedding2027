import { Page } from '@playwright/test';

export interface PageMetrics {
  pageLoadTime: number;
  domContentLoadedTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

export interface ResourceMetrics {
  totalRequests: number;
  totalSize: number;
  documentSize: number;
  scriptSize: number;
  styleSize: number;
  imageSize: number;
}

export class PerformanceHelpers {
  static async getPageMetrics(page: Page): Promise<PageMetrics> {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const largestContentfulPaint = performance
        .getEntriesByType('largest-contentful-paint')
        .slice(-1)[0] as PerformanceEntry | undefined;

      const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');
      const firstContentfulPaint = paintEntries.find((entry) => entry.name === 'first-contentful-paint');

      return {
        pageLoadTime: navigation?.loadEventEnd - navigation?.fetchStart || 0,
        domContentLoadedTime: navigation?.domContentLoadedEventEnd - navigation?.fetchStart || 0,
        firstPaint: firstPaint?.startTime || 0,
        firstContentfulPaint: firstContentfulPaint?.startTime || 0,
        largestContentfulPaint: largestContentfulPaint?.startTime || 0,
        cumulativeLayoutShift: 0, // Would need PerformanceObserver
        timeToInteractive: navigation?.domInteractive - navigation?.fetchStart || 0,
      };
    });

    return metrics;
  }

  static async getResourceMetrics(page: Page): Promise<ResourceMetrics> {
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      const metrics = {
        totalRequests: entries.length,
        totalSize: 0,
        documentSize: 0,
        scriptSize: 0,
        styleSize: 0,
        imageSize: 0,
      };

      entries.forEach((entry) => {
        const transferSize = entry.transferSize || 0;
        metrics.totalSize += transferSize;

        if (entry.name.includes('.js')) {
          metrics.scriptSize += transferSize;
        } else if (entry.name.includes('.css')) {
          metrics.styleSize += transferSize;
        } else if (entry.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
          metrics.imageSize += transferSize;
        } else {
          metrics.documentSize += transferSize;
        }
      });

      return metrics;
    });

    return resources;
  }

  static async measureLoadTime(page: Page, path: string): Promise<number> {
    const startTime = Date.now();
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  static async measureInteractiveTime(page: Page): Promise<number> {
    return page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation?.domInteractive - navigation?.fetchStart || 0;
    });
  }

  static async checkWebVitals(page: Page) {
    return page.evaluate(() => {
      return new Promise<{
        LCP: number;
        FID: number;
        CLS: number;
      }>((resolve) => {
        const vitals = {
          LCP: 0,
          FID: 0,
          CLS: 0,
        };

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.LCP = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            vitals.FID = entry.processingDuration;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              vitals.CLS += entry.value;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
          resolve(vitals);
        }, 5000);
      });
    });
  }

  static async measureApiResponseTime(page: Page): Promise<{ endpoint: string; time: number }[]> {
    const timings: { endpoint: string; time: number }[] = [];

    page.on('response', (response) => {
      const request = response.request();
      if (request.url().includes('/api/')) {
        const timing = {
          endpoint: new URL(request.url()).pathname,
          time: response.timing().responseEnd - response.timing().responseStart,
        };
        timings.push(timing);
      }
    });

    return new Promise((resolve) => {
      setTimeout(() => resolve(timings), 5000);
    });
  }

  static async checkJavaScriptErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.toString());
    });

    return errors;
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  static formatMilliseconds(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  static generatePerformanceReport(metrics: PageMetrics, resources: ResourceMetrics) {
    return `
Performance Report:
==================
Page Load Time:           ${this.formatMilliseconds(metrics.pageLoadTime)}
DOM Content Loaded:       ${this.formatMilliseconds(metrics.domContentLoadedTime)}
First Paint:             ${this.formatMilliseconds(metrics.firstPaint)}
First Contentful Paint:  ${this.formatMilliseconds(metrics.firstContentfulPaint)}
Largest Contentful Paint: ${this.formatMilliseconds(metrics.largestContentfulPaint)}
Time to Interactive:     ${this.formatMilliseconds(metrics.timeToInteractive)}

Resource Metrics:
================
Total Requests:          ${resources.totalRequests}
Total Size:              ${this.formatBytes(resources.totalSize)}
Document Size:           ${this.formatBytes(resources.documentSize)}
Script Size:             ${this.formatBytes(resources.scriptSize)}
Style Size:              ${this.formatBytes(resources.styleSize)}
Image Size:              ${this.formatBytes(resources.imageSize)}
    `;
  }
}
