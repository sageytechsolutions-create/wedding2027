import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly portfolioSummary: Locator;
  readonly totalPropertiesCard: Locator;
  readonly totalValueCard: Locator;
  readonly cashFlowCard: Locator;
  readonly addPropertyButton: Locator;
  readonly propertyList: Locator;
  readonly propertyItems: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;

  constructor(page: Page) {
    super(page);
    this.portfolioSummary = page.locator('[data-testid="portfolio-summary"]');
    this.totalPropertiesCard = page.locator('[data-testid="total-properties"]');
    this.totalValueCard = page.locator('[data-testid="total-value"]');
    this.cashFlowCard = page.locator('[data-testid="cash-flow"]');
    this.addPropertyButton = page.locator('button:has-text("Add Property")');
    this.propertyList = page.locator('[data-testid="property-list"]');
    this.propertyItems = page.locator('[data-testid="property-item"]');
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.filterButton = page.locator('button:has-text("Filter")');
  }

  async navigateToDashboard() {
    await this.navigate('/dashboard');
    await this.waitForPageLoad();
  }

  async isPortfolioSummaryVisible() {
    return this.portfolioSummary.isVisible();
  }

  async getTotalProperties() {
    const text = await this.totalPropertiesCard.textContent();
    return parseInt(text?.match(/\d+/)?.[0] || '0') || 0;
  }

  async getTotalValue() {
    const text = await this.totalValueCard.textContent();
    return text;
  }

  async getCashFlow() {
    const text = await this.cashFlowCard.textContent();
    return text;
  }

  async clickAddProperty() {
    await this.addPropertyButton.click();
    await this.waitForPageLoad();
  }

  async getPropertyCount() {
    return this.propertyItems.count();
  }

  async searchProperties(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForPageLoad();
  }

  async openPropertyDetails(index: number) {
    const items = this.propertyItems;
    await items.nth(index).click();
    await this.waitForPageLoad();
  }
}
