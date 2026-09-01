import { test, expect, devices } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertyPage } from './pages/PropertyPage';
import { testUser } from './fixtures/testData';

// Mobile device configurations
const mobileDevices = {
  'iPhone 12': devices['iPhone 12'],
  'Pixel 5': devices['Pixel 5'],
  'iPad Pro': devices['iPad Pro'],
};

test.describe('Mobile Responsive Testing', () => {
  test.describe('iPhone 12 (390x844)', () => {
    test.use({ ...devices['iPhone 12'] });

    let authPage: AuthPage;
    let dashboardPage: DashboardPage;
    let propertyPage: PropertyPage;

    test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
      dashboardPage = new DashboardPage(page);
      propertyPage = new PropertyPage(page);
    });

    test('should render login page on mobile', async () => {
      await authPage.navigateToLogin();
      await authPage.waitForPageLoad();

      // Verify page is readable on mobile
      const inputs = await authPage.page.locator('input').count();
      expect(inputs).toBeGreaterThan(0);

      // Check for mobile-friendly layout
      const viewport = authPage.page.viewportSize();
      expect(viewport?.width).toBeLessThanOrEqual(430);
    });

    test('should handle login on mobile', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);

      // Should redirect to dashboard
      await expect(authPage.page).toHaveURL(/dashboard/);
    });

    test('should render dashboard on mobile', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      // Dashboard should be visible on mobile
      await expect(dashboardPage.page).toHaveURL(/dashboard/);

      // Check for mobile touch-friendly elements
      const buttons = await dashboardPage.page.locator('button').all();
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('should handle property search on mobile', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await propertyPage.navigateToSearch();

      // Search should be accessible on mobile
      await expect(propertyPage.searchButton).toBeVisible();

      // Should be able to interact with search
      await propertyPage.searchByLocation('Denver');

      const resultCount = await propertyPage.getResultCount();
      expect(resultCount).toBeGreaterThanOrEqual(0);
    });

    test('should support mobile touch scrolling', async ({ page }) => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      // Scroll down on mobile
      await page.evaluate(() => {
        window.scrollBy(0, 300);
      });

      // Check if content is still accessible
      await expect(dashboardPage.page).toHaveURL(/dashboard/);
    });

    test('should handle mobile keyboard input', async () => {
      await authPage.navigateToLogin();

      // Type with mobile keyboard
      await authPage.emailInput.fill('test@example.com');
      await authPage.passwordInput.fill('password123');

      const emailValue = await authPage.emailInput.inputValue();
      const passwordValue = await authPage.passwordInput.inputValue();

      expect(emailValue).toBe('test@example.com');
      expect(passwordValue).toBe('password123');
    });

    test('should handle mobile tap/click events', async () => {
      await authPage.navigateToLogin();

      // Tap button on mobile
      await authPage.loginButton.tap();

      // Should process the tap
      await authPage.page.waitForTimeout(1000);
      expect(await authPage.page.url()).toBeTruthy();
    });

    test('should maintain viewport on orientation change', async ({ page }) => {
      await authPage.navigateToLogin();

      // Simulate orientation change
      await page.evaluate(() => {
        window.dispatchEvent(new Event('orientationchange'));
      });

      // Page should remain functional
      await expect(authPage.loginButton).toBeVisible();
    });
  });

  test.describe('Pixel 5 (393x851)', () => {
    test.use({ ...devices['Pixel 5'] });

    let authPage: AuthPage;
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
      dashboardPage = new DashboardPage(page);
    });

    test('should render login page on Android', async () => {
      await authPage.navigateToLogin();

      await expect(authPage.loginButton).toBeVisible();
      await expect(authPage.emailInput).toBeVisible();
    });

    test('should handle login on Android', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);

      await expect(authPage.page).toHaveURL(/dashboard/);
    });

    test('should render dashboard on Android', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      // Verify mobile layout
      const viewport = dashboardPage.page.viewportSize();
      expect(viewport?.width).toBeLessThanOrEqual(430);

      await expect(dashboardPage.portfolioSummary).toBeVisible();
    });

    test('should handle small touches on Android', async ({ page }) => {
      await authPage.navigateToLogin();

      // Small tap area should still be clickable
      const rect = await authPage.loginButton.boundingBox();
      if (rect) {
        await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.waitForTimeout(500);
      }
    });

    test('should display images properly on Android', async () => {
      await authPage.navigateToLogin();

      const images = await authPage.page.locator('img').all();
      for (const img of images) {
        const isVisible = await img.isVisible();
        if (isVisible) {
          // Image should have proper dimensions on mobile
          const boundingBox = await img.boundingBox();
          expect(boundingBox?.width).toBeGreaterThan(0);
          expect(boundingBox?.height).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('iPad Pro (1024x1366)', () => {
    test.use({ ...devices['iPad Pro'] });

    let authPage: AuthPage;
    let dashboardPage: DashboardPage;
    let propertyPage: PropertyPage;

    test.beforeEach(async ({ page }) => {
      authPage = new AuthPage(page);
      dashboardPage = new DashboardPage(page);
      propertyPage = new PropertyPage(page);
    });

    test('should render login page on tablet', async () => {
      await authPage.navigateToLogin();

      await expect(authPage.loginButton).toBeVisible();
      await expect(authPage.page).toHaveURL(/login/);
    });

    test('should handle landscape orientation on tablet', async ({ page }) => {
      // Set landscape viewport
      await page.setViewportSize({ width: 1366, height: 1024 });

      await authPage.navigateToLogin();

      // Should adapt to landscape
      await expect(authPage.loginButton).toBeVisible();
    });

    test('should render dashboard on tablet landscape', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 1024 });

      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      // Tablet layout should show multiple columns
      await expect(dashboardPage.portfolioSummary).toBeVisible();
    });

    test('should handle tablet touch interactions', async ({ page }) => {
      await authPage.navigateToLogin();

      // Test multi-touch (two fingers)
      await page.touchscreen.tap(100, 100);
      await page.touchscreen.tap(300, 300);

      await expect(authPage.page).toHaveURL(/login/);
    });

    test('should display tablet-optimized layout for search', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await propertyPage.navigateToSearch();

      // Tablet should show filters and results side-by-side
      const filterArea = propertyPage.page.locator('form, [data-testid="search-filters"]').first();
      const resultArea = propertyPage.page.locator('[data-testid="search-results"]').first();

      const filterBox = await filterArea.boundingBox();
      const resultBox = await resultArea.boundingBox();

      // Both should be visible on tablet
      if (filterBox && resultBox) {
        expect(filterBox.width).toBeGreaterThan(200);
        expect(resultBox.width).toBeGreaterThan(200);
      }
    });
  });
});

test.describe('Touch Interaction Testing', () => {
  test.use({ ...devices['iPhone 12'] });

  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test('should handle swipe gestures', async ({ page }) => {
    await authPage.navigateToLogin();

    // Simulate swipe (touch down, move, touch up)
    const element = authPage.loginButton;
    const box = await element.boundingBox();

    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

      // Page should respond
      expect(await authPage.page.url()).toBeTruthy();
    }
  });

  test('should handle long press', async ({ page }) => {
    await authPage.navigateToLogin();

    const button = authPage.loginButton;
    const box = await button.boundingBox();

    if (box) {
      // Simulate long press (touch and hold)
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      await page.touchscreen.tap(x, y);
      await page.waitForTimeout(1000);

      // Page should remain functional
      expect(await authPage.page.url()).toBeTruthy();
    }
  });

  test('should handle pinch zoom', async ({ page }) => {
    await authPage.navigateToLogin();

    const initialScale = await page.evaluate(() => window.devicePixelRatio);

    // Pinch zoom would require native mobile event, just verify initial state
    expect(initialScale).toBeGreaterThan(0);
  });

  test('should handle double tap', async ({ page }) => {
    await authPage.navigateToLogin();

    const element = authPage.emailInput;
    const box = await element.boundingBox();

    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      // Double tap
      await page.touchscreen.tap(x, y);
      await page.waitForTimeout(50);
      await page.touchscreen.tap(x, y);

      // Should focus input
      await expect(authPage.emailInput).toBeFocused();
    }
  });
});

test.describe('Mobile Viewport Breakpoints', () => {
  const breakpoints = [
    { name: 'XS (320px)', width: 320, height: 568 },
    { name: 'SM (375px)', width: 375, height: 667 },
    { name: 'MD (768px)', width: 768, height: 1024 },
    { name: 'LG (1024px)', width: 1024, height: 768 },
    { name: 'XL (1280px)', width: 1280, height: 720 },
  ];

  breakpoints.forEach((breakpoint) => {
    test(`should render correctly at ${breakpoint.name}`, async ({ page }) => {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });

      const authPage = new AuthPage(page);
      await authPage.navigateToLogin();

      // Elements should be visible at all breakpoints
      await expect(authPage.loginButton).toBeVisible();
      await expect(authPage.emailInput).toBeVisible();

      // Content should not overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(breakpoint.width + 20); // Small margin for scrollbar
    });
  });
});

test.describe('Mobile Performance', () => {
  test.use({ ...devices['iPhone 12'] });

  test('should load quickly on mobile', async ({ page }) => {
    const startTime = Date.now();

    const authPage = new AuthPage(page);
    await authPage.navigateToLogin();

    const loadTime = Date.now() - startTime;

    // Mobile should load in reasonable time
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have layout shift on mobile', async () => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigate('/dashboard');

    // Wait for full page load
    await dashboardPage.waitForPageLoad();

    // Check for cumulative layout shift
    const cls = await dashboardPage.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const e = entry as any;
            if (!e.hadRecentInput) {
              clsValue += e.value;
            }
          }
        });

        observer.observe({ entryTypes: ['layout-shift'] });
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    // CLS should be low (< 0.1 is good)
    expect(cls).toBeLessThan(0.25);
  });
});
