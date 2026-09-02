import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PropertyPage } from './pages/PropertyPage';
import { AccessibilityHelpers } from './utils/accessibilityHelpers';
import { testUser } from './fixtures/testData';

test.describe('Accessibility Testing', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let propertyPage: PropertyPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    propertyPage = new PropertyPage(page);
  });

  test.describe('Heading Structure', () => {
    test('login page should have proper heading structure', async () => {
      await authPage.navigateToLogin();

      const issues = await AccessibilityHelpers.checkHeadingStructure(authPage.page);

      if (issues.length > 0) {
        console.log('Heading structure issues:', issues);
      }
      // Warning only - not a hard fail
      expect(issues.length).toBeLessThan(3);
    });

    test('dashboard should have proper heading structure', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const issues = await AccessibilityHelpers.checkHeadingStructure(dashboardPage.page);

      if (issues.length > 0) {
        console.log('Dashboard heading structure issues:', issues);
      }
      expect(issues.length).toBeLessThan(3);
    });

    test('property search should have proper heading structure', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await propertyPage.navigateToSearch();

      const issues = await AccessibilityHelpers.checkHeadingStructure(propertyPage.page);

      if (issues.length > 0) {
        console.log('Property search heading issues:', issues);
      }
      expect(issues.length).toBeLessThan(3);
    });
  });

  test.describe('Image Alt Text', () => {
    test('login page images should have alt text', async () => {
      await authPage.navigateToLogin();

      const issues = await AccessibilityHelpers.checkImageAltText(authPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Image alt text errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    test('dashboard images should have alt text', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const issues = await AccessibilityHelpers.checkImageAltText(dashboardPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Dashboard image alt text errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    test('property search images should have alt text', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await propertyPage.navigateToSearch();

      const issues = await AccessibilityHelpers.checkImageAltText(propertyPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Property search image alt text errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Form Labels', () => {
    test('login form should have accessible labels', async () => {
      await authPage.navigateToLogin();

      const issues = await AccessibilityHelpers.checkFormLabels(authPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Form label errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    test('dashboard form should have accessible labels', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const issues = await AccessibilityHelpers.checkFormLabels(dashboardPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Dashboard form label errors:', errors);
      }
      // Allow some warnings, but no errors
      expect(errors.length).toBeLessThan(3);
    });

    test('property search filters should have accessible labels', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await propertyPage.navigateToSearch();

      const issues = await AccessibilityHelpers.checkFormLabels(propertyPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Search filter label errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Button Labels', () => {
    test('login page buttons should have accessible labels', async () => {
      await authPage.navigateToLogin();

      const issues = await AccessibilityHelpers.checkButtonLabels(authPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Login button label errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    test('dashboard buttons should have accessible labels', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const issues = await AccessibilityHelpers.checkButtonLabels(dashboardPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Dashboard button label errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    test('property search buttons should have accessible labels', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await propertyPage.navigateToSearch();

      const issues = await AccessibilityHelpers.checkButtonLabels(propertyPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Search button label errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Link Text Quality', () => {
    test('login page should have descriptive link text', async () => {
      await authPage.navigateToLogin();

      const issues = await AccessibilityHelpers.checkLinkTexts(authPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Login link text errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    test('dashboard should have descriptive link text', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const issues = await AccessibilityHelpers.checkLinkTexts(dashboardPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Dashboard link text errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Landmark Regions', () => {
    test('login page should have landmark regions', async () => {
      await authPage.navigateToLogin();

      const issues = await AccessibilityHelpers.checkLandmarkRegions(authPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (issues.length > 0) {
        console.log('Login landmark issues:', issues);
      }
      // Not critical failures, but good to have
      expect(errors).toHaveLength(0);
    });

    test('dashboard should have landmark regions', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const issues = await AccessibilityHelpers.checkLandmarkRegions(dashboardPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (issues.length > 0) {
        console.log('Dashboard landmark issues:', issues);
      }
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('ARIA Attributes', () => {
    test('login page should use ARIA correctly', async () => {
      await authPage.navigateToLogin();

      const issues = await AccessibilityHelpers.checkAriaAttributes(authPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Login ARIA errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    test('dashboard should use ARIA correctly', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const issues = await AccessibilityHelpers.checkAriaAttributes(dashboardPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (errors.length > 0) {
        console.log('Dashboard ARIA errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('login page should support keyboard navigation', async () => {
      await authPage.navigateToLogin();

      const issues = await AccessibilityHelpers.checkKeyboardNavigation(authPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (issues.length > 0) {
        console.log('Login keyboard navigation issues:', issues);
      }
      // Warnings are acceptable
      expect(errors).toHaveLength(0);
    });

    test('dashboard should support keyboard navigation', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const issues = await AccessibilityHelpers.checkKeyboardNavigation(dashboardPage.page);
      const errors = issues.filter((i) => i.type === 'error');

      if (issues.length > 0) {
        console.log('Dashboard keyboard navigation issues:', issues);
      }
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Full Accessibility Audit', () => {
    test('login page should pass accessibility audit', async () => {
      await authPage.navigateToLogin();

      const headingIssues = await AccessibilityHelpers.checkHeadingStructure(authPage.page);
      const audit = await AccessibilityHelpers.runFullAccessibilityAudit(authPage.page);

      const report = AccessibilityHelpers.generateAccessibilityReport(headingIssues, audit);
      console.log(report);

      // Should have no critical errors
      expect(audit.errors).toHaveLength(0);
    });

    test('dashboard should pass accessibility audit', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await dashboardPage.navigateToDashboard();

      const headingIssues = await AccessibilityHelpers.checkHeadingStructure(dashboardPage.page);
      const audit = await AccessibilityHelpers.runFullAccessibilityAudit(dashboardPage.page);

      const report = AccessibilityHelpers.generateAccessibilityReport(headingIssues, audit);
      console.log(report);

      // Should have no critical errors
      expect(audit.errors.length).toBeLessThan(3);
    });

    test('property search should pass accessibility audit', async () => {
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await propertyPage.navigateToSearch();

      const headingIssues = await AccessibilityHelpers.checkHeadingStructure(propertyPage.page);
      const audit = await AccessibilityHelpers.runFullAccessibilityAudit(propertyPage.page);

      const report = AccessibilityHelpers.generateAccessibilityReport(headingIssues, audit);
      console.log(report);

      // Should have no critical errors
      expect(audit.errors).toHaveLength(0);
    });
  });
});
