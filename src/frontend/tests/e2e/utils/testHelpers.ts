import { Page, expect } from '@playwright/test';

export class TestHelpers {
  static async waitForUrl(page: Page, urlPattern: string | RegExp) {
    await page.waitForURL(urlPattern);
  }

  static async expectElementToHaveText(page: Page, selector: string, text: string) {
    const element = page.locator(selector);
    await expect(element).toContainText(text);
  }

  static async expectElementToBeVisible(page: Page, selector: string) {
    const element = page.locator(selector);
    await expect(element).toBeVisible();
  }

  static async expectElementToBeHidden(page: Page, selector: string) {
    const element = page.locator(selector);
    await expect(element).toBeHidden();
  }

  static async fillFormField(page: Page, label: string, value: string) {
    const input = page.locator(`input:near(:text("${label}"))`);
    await input.fill(value);
  }

  static async selectDropdown(page: Page, label: string, value: string) {
    const select = page.locator(`select:near(:text("${label}"))`);
    await select.selectOption(value);
  }

  static async clickButton(page: Page, text: string) {
    await page.locator(`button:has-text("${text}")`).click();
  }

  static async getTableRowCount(page: Page, tableSelector: string) {
    return page.locator(`${tableSelector} tr`).count();
  }

  static async getTableCellText(page: Page, tableSelector: string, row: number, col: number) {
    return page.locator(`${tableSelector} tr:nth-child(${row}) td:nth-child(${col})`).textContent();
  }

  static async dismissNotification(page: Page) {
    const closeButton = page.locator('button[aria-label="Close notification"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  static async waitForNotification(page: Page, timeout = 5000) {
    await page.locator('[role="alert"]').waitFor({ state: 'visible', timeout });
  }

  static async getNotificationText(page: Page) {
    return page.locator('[role="alert"]').textContent();
  }

  static async interceptAPI(page: Page, urlPattern: string, response: any) {
    await page.route(urlPattern, (route) => {
      route.abort('blockedbyclient');
    });
  }

  static async mockAPIResponse(page: Page, urlPattern: string, response: any) {
    await page.route(urlPattern, (route) => {
      route.continue({
        response: {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        },
      });
    });
  }

  static async captureVideoFrame(page: Page, name: string) {
    await page.screenshot({
      path: `test-results/frames/${name}-${Date.now()}.png`,
    });
  }

  static async getAllElementsText(page: Page, selector: string) {
    return page.locator(selector).allTextContents();
  }

  static async scrollToElement(page: Page, selector: string) {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  static async hoverElement(page: Page, selector: string) {
    await page.locator(selector).hover();
  }

  static async doubleClickElement(page: Page, selector: string) {
    await page.locator(selector).dblclick();
  }

  static async clearInput(page: Page, selector: string) {
    await page.locator(selector).clear();
  }

  static async getInputValue(page: Page, selector: string) {
    return page.locator(selector).inputValue();
  }

  static delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
