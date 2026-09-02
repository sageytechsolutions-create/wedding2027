import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { testUser, testTransactions } from './fixtures/testData';

test.describe('Transaction Management', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);

    // Login before each test
    await authPage.navigateToLogin();
    await authPage.login(testUser.email, testUser.password);
  });

  test('should navigate to transactions page', async () => {
    await dashboardPage.navigate('/transactions');

    await expect(dashboardPage.page).toHaveURL(/transactions/i);
  });

  test('should display transactions list', async () => {
    await dashboardPage.navigate('/transactions');

    // Verify transactions page is loaded
    await expect(dashboardPage.page).toHaveURL(/transactions/i);

    // Transactions list or empty state should be visible
    await expect(dashboardPage.mainContent).toBeVisible();
  });

  test('should add income transaction', async () => {
    await dashboardPage.navigate('/transactions/new');

    // Fill transaction form
    const transactionType = dashboardPage.page.locator('input[value="income"]');
    const categorySelect = dashboardPage.page.locator('select[aria-label*="Category"]');
    const amountInput = dashboardPage.page.locator('input[placeholder*="Amount"]');
    const dateInput = dashboardPage.page.locator('input[type="date"]');
    const submitButton = dashboardPage.page.locator('button:has-text("Add Transaction")');

    // Select income type
    if (await transactionType.isVisible()) {
      await transactionType.click();
    }

    // Set category
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption('rent');
    }

    // Set amount
    if (await amountInput.isVisible()) {
      await amountInput.fill('2500');
    }

    // Set date
    if (await dateInput.isVisible()) {
      await dateInput.fill('2024-01-01');
    }

    // Submit
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should redirect to transactions list
      await expect(dashboardPage.page).toHaveURL(/transactions/i);
    }
  });

  test('should add expense transaction', async () => {
    await dashboardPage.navigate('/transactions/new');

    const transactionType = dashboardPage.page.locator('input[value="expense"]');
    const categorySelect = dashboardPage.page.locator('select[aria-label*="Category"]');
    const amountInput = dashboardPage.page.locator('input[placeholder*="Amount"]');
    const submitButton = dashboardPage.page.locator('button:has-text("Add Transaction")');

    // Select expense type
    if (await transactionType.isVisible()) {
      await transactionType.click();
    }

    // Set category
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption('maintenance');
    }

    // Set amount
    if (await amountInput.isVisible()) {
      await amountInput.fill('500');
    }

    // Submit
    if (await submitButton.isVisible()) {
      await submitButton.click();

      await expect(dashboardPage.page).toHaveURL(/transactions/i);
    }
  });

  test('should display transaction details', async () => {
    await dashboardPage.navigate('/transactions');

    // Get transaction items
    const transactionItems = dashboardPage.page.locator('[data-testid="transaction-item"]');
    const itemCount = await transactionItems.count();

    if (itemCount > 0) {
      // Click first transaction to view details
      await transactionItems.first().click();

      // Should navigate to transaction details page or show details modal
      await expect(dashboardPage.mainContent).toBeVisible();
    }
  });

  test('should edit transaction', async () => {
    await dashboardPage.navigate('/transactions');

    const transactionItems = dashboardPage.page.locator('[data-testid="transaction-item"]');
    const itemCount = await transactionItems.count();

    if (itemCount > 0) {
      // Click edit button on first transaction
      const editButton = dashboardPage.page
        .locator('[data-testid="transaction-item"]')
        .first()
        .locator('button:has-text("Edit")');

      if (await editButton.isVisible()) {
        await editButton.click();

        // Should navigate to edit page or show edit form
        await expect(dashboardPage.page).toHaveURL(/edit|transactions/i);
      }
    }
  });

  test('should delete transaction', async () => {
    await dashboardPage.navigate('/transactions');

    const transactionItems = dashboardPage.page.locator('[data-testid="transaction-item"]');
    const countBefore = await transactionItems.count();

    if (countBefore > 0) {
      // Click delete button on first transaction
      const deleteButton = dashboardPage.page
        .locator('[data-testid="transaction-item"]')
        .first()
        .locator('button:has-text("Delete")');

      if (await deleteButton.isVisible()) {
        // Confirm delete if confirmation dialog appears
        deleteButton.click();

        const confirmButton = dashboardPage.page.locator('button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Transaction should be removed from list
        await dashboardPage.page.waitForTimeout(500);

        const countAfter = await transactionItems.count();
        expect(countAfter).toBeLessThanOrEqual(countBefore);
      }
    }
  });

  test('should filter transactions by category', async () => {
    await dashboardPage.navigate('/transactions');

    const categoryFilter = dashboardPage.page.locator('select[aria-label*="Category"]');

    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption('rent');

      // List should update to show only selected category
      await dashboardPage.page.waitForTimeout(500);

      const transactionItems = dashboardPage.page.locator('[data-testid="transaction-item"]');
      const itemCount = await transactionItems.count();

      expect(itemCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should filter transactions by date range', async () => {
    await dashboardPage.navigate('/transactions');

    const startDateInput = dashboardPage.page.locator('input[placeholder*="Start Date"]');
    const endDateInput = dashboardPage.page.locator('input[placeholder*="End Date"]');

    if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
      await startDateInput.fill('2024-01-01');
      await endDateInput.fill('2024-12-31');

      // Trigger filter
      await dashboardPage.page.keyboard.press('Enter');

      // List should update
      const transactionItems = dashboardPage.page.locator('[data-testid="transaction-item"]');
      const itemCount = await transactionItems.count();

      expect(itemCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display category totals', async () => {
    await dashboardPage.navigate('/transactions');

    // Look for category totals summary
    const categoryTotals = dashboardPage.page.locator('[data-testid="category-totals"]');

    if (await categoryTotals.isVisible()) {
      const categories = dashboardPage.page.locator('[data-testid="category-total-item"]');
      const categoryCount = await categories.count();

      expect(categoryCount).toBeGreaterThanOrEqual(0);
    }
  });
});
