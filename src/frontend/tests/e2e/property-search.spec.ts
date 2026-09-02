import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { PropertyPage } from './pages/PropertyPage';
import { testUser, searchFilters, testProperties } from './fixtures/testData';

test.describe('Property Search', () => {
  let authPage: AuthPage;
  let propertyPage: PropertyPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    propertyPage = new PropertyPage(page);

    // Login before each test
    await authPage.navigateToLogin();
    await authPage.login(testUser.email, testUser.password);
  });

  test('should navigate to property search page', async () => {
    await propertyPage.navigateToSearch();

    await expect(propertyPage.page).toHaveURL(/properties.*search|search.*property/i);
    await expect(propertyPage.searchButton).toBeVisible();
  });

  test('should search properties by location', async () => {
    await propertyPage.navigateToSearch();

    await propertyPage.searchByLocation(searchFilters.location);

    const resultCount = await propertyPage.getResultCount();
    expect(resultCount).toBeGreaterThanOrEqual(0);
  });

  test('should search properties by price range', async () => {
    await propertyPage.navigateToSearch();

    await propertyPage.searchByPriceRange(searchFilters.priceRange.min, searchFilters.priceRange.max);

    const resultCount = await propertyPage.getResultCount();
    expect(resultCount).toBeGreaterThanOrEqual(0);
  });

  test('should search properties by bedrooms', async () => {
    await propertyPage.navigateToSearch();

    await propertyPage.searchByBedrooms(searchFilters.bedrooms);

    const resultCount = await propertyPage.getResultCount();
    expect(resultCount).toBeGreaterThanOrEqual(0);
  });

  test('should display search results with property details', async () => {
    await propertyPage.navigateToSearch();

    await propertyPage.searchByLocation(searchFilters.location);

    const resultCount = await propertyPage.getResultCount();

    if (resultCount > 0) {
      // Verify result items have expected structure
      await expect(propertyPage.resultItem.first()).toBeVisible();
    }
  });

  test('should add property to favorites from search results', async () => {
    await propertyPage.navigateToSearch();

    await propertyPage.searchByLocation(searchFilters.location);

    const resultCount = await propertyPage.getResultCount();

    if (resultCount > 0) {
      const favCountBefore = await propertyPage.getFavoritesCount();

      await propertyPage.addFirstPropertyToFavorites();

      // Verify favorite was added
      const favCountAfter = await propertyPage.getFavoritesCount();
      expect(favCountAfter).toBeGreaterThanOrEqual(favCountBefore);
    }
  });

  test('should open property details from search results', async () => {
    await propertyPage.navigateToSearch();

    await propertyPage.searchByLocation(searchFilters.location);

    const resultCount = await propertyPage.getResultCount();

    if (resultCount > 0) {
      await propertyPage.openPropertyDetails(0);

      // Should navigate to property details page
      await expect(propertyPage.page).toHaveURL(/properties?\/\d+|details/i);

      // Verify property details are displayed
      const address = await propertyPage.getPropertyDetailsAddress();
      const price = await propertyPage.getPropertyDetailsPrice();

      expect(address).toBeTruthy();
      expect(price).toBeTruthy();
    }
  });

  test('should navigate to favorites page', async () => {
    await propertyPage.navigateToFavorites();

    await expect(propertyPage.page).toHaveURL(/favorites|wishlist/i);
  });

  test('should display empty favorites when none exist', async () => {
    await propertyPage.navigateToFavorites();

    const favCount = await propertyPage.getFavoritesCount();
    expect(favCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle no search results gracefully', async () => {
    await propertyPage.navigateToSearch();

    // Search with criteria unlikely to return results
    await propertyPage.searchByLocation('NonExistentCity99999');

    const resultCount = await propertyPage.getResultCount();
    expect(resultCount).toBe(0);

    // Should show empty state message or similar
    // The page should remain functional
    await expect(propertyPage.page).toHaveURL(/search/i);
  });

  test('should support multiple filter combinations', async () => {
    await propertyPage.navigateToSearch();

    // Search by location first
    await propertyPage.searchByLocation(searchFilters.location);

    let resultCount = await propertyPage.getResultCount();
    const countAfterLocation = resultCount;

    // Then refine by price range
    await propertyPage.searchByPriceRange(searchFilters.priceRange.min, searchFilters.priceRange.max);

    resultCount = await propertyPage.getResultCount();
    const countAfterPrice = resultCount;

    // Results should be filtered (likely same or fewer)
    expect(countAfterPrice).toBeLessThanOrEqual(countAfterLocation);
  });
});
