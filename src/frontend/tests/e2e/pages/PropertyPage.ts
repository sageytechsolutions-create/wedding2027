import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class PropertyPage extends BasePage {
  readonly searchBox: Locator;
  readonly minPriceInput: Locator;
  readonly maxPriceInput: Locator;
  readonly locationInput: Locator;
  readonly bedroomsSelect: Locator;
  readonly searchButton: Locator;
  readonly propertyResults: Locator;
  readonly resultItem: Locator;
  readonly addToFavoritesButton: Locator;
  readonly favoritesList: Locator;
  readonly propertyDetails: Locator;
  readonly propertyAddress: Locator;
  readonly propertyPrice: Locator;

  constructor(page: Page) {
    super(page);
    this.searchBox = page.locator('[data-testid="property-search"]');
    this.minPriceInput = page.locator('input[placeholder*="Min Price"]');
    this.maxPriceInput = page.locator('input[placeholder*="Max Price"]');
    this.locationInput = page.locator('input[placeholder*="Location"]');
    this.bedroomsSelect = page.locator('select[aria-label*="Bedrooms"]');
    this.searchButton = page.locator('button:has-text("Search")');
    this.propertyResults = page.locator('[data-testid="search-results"]');
    this.resultItem = page.locator('[data-testid="property-result-item"]');
    this.addToFavoritesButton = page.locator('button:has-text("Add to Favorites")');
    this.favoritesList = page.locator('[data-testid="favorites-list"]');
    this.propertyDetails = page.locator('[data-testid="property-details"]');
    this.propertyAddress = page.locator('[data-testid="property-address"]');
    this.propertyPrice = page.locator('[data-testid="property-price"]');
  }

  async navigateToSearch() {
    await this.navigate('/properties/search');
    await this.waitForPageLoad();
  }

  async navigateToFavorites() {
    await this.navigate('/properties/favorites');
    await this.waitForPageLoad();
  }

  async searchByLocation(location: string) {
    await this.locationInput.fill(location);
    await this.searchButton.click();
    await this.waitForPageLoad();
  }

  async searchByPriceRange(minPrice: string, maxPrice: string) {
    await this.minPriceInput.fill(minPrice);
    await this.maxPriceInput.fill(maxPrice);
    await this.searchButton.click();
    await this.waitForPageLoad();
  }

  async searchByBedrooms(bedrooms: string) {
    await this.bedroomsSelect.selectOption(bedrooms);
    await this.searchButton.click();
    await this.waitForPageLoad();
  }

  async getResultCount() {
    return this.resultItem.count();
  }

  async addFirstPropertyToFavorites() {
    const firstResult = this.resultItem.first();
    await firstResult.hover();
    await this.addToFavoritesButton.first().click();
    await this.page.waitForTimeout(500);
  }

  async openPropertyDetails(index: number) {
    await this.resultItem.nth(index).click();
    await this.waitForPageLoad();
  }

  async getPropertyDetailsAddress() {
    return this.propertyAddress.textContent();
  }

  async getPropertyDetailsPrice() {
    return this.propertyPrice.textContent();
  }

  async getFavoritesCount() {
    return this.favoritesList.locator('[data-testid="favorite-item"]').count();
  }
}
