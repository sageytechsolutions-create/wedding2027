import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { testUser, testUserNew, invalidCredentials, incompleteForm } from './fixtures/testData';

test.describe('Authentication Flow', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test('should login with valid credentials', async () => {
    await authPage.navigateToLogin();
    await expect(authPage.page).toHaveTitle(/Login/i);

    await authPage.login(testUser.email, testUser.password);

    // Should redirect to dashboard after successful login
    await expect(authPage.page).toHaveURL(/dashboard/);
    expect(await authPage.isLoggedIn()).toBe(true);
  });

  test('should display error for invalid credentials', async () => {
    await authPage.navigateToLogin();

    await authPage.emailInput.fill(invalidCredentials.email);
    await authPage.passwordInput.fill(invalidCredentials.password);
    await authPage.loginButton.click();

    // Should stay on login page and show error
    await expect(authPage.page).toHaveURL(/login/);
    const errorMsg = await authPage.getErrorMessage();
    expect(errorMsg).toBeTruthy();
  });

  test('should require email and password for login', async () => {
    await authPage.navigateToLogin();

    // Try to login without filling form
    await authPage.loginButton.click();

    // Should show validation errors
    await expect(authPage.page).toHaveURL(/login/);
  });

  test('should logout successfully', async () => {
    await authPage.navigateToLogin();
    await authPage.login(testUser.email, testUser.password);

    // Verify logged in
    expect(await authPage.isLoggedIn()).toBe(true);

    // Logout
    await authPage.logout();

    // Should redirect to login and not show logout button
    await expect(authPage.page).toHaveURL(/login|auth/);
    expect(await authPage.isLoggedIn()).toBe(false);
  });

  test('should prevent access to protected pages when not logged in', async () => {
    // Try to navigate to dashboard without logging in
    await authPage.navigate('/dashboard');

    // Should redirect to login
    await expect(authPage.page).toHaveURL(/login|auth/);
  });

  test('should signup new user', async () => {
    await authPage.navigateToSignup();
    await expect(authPage.page).toHaveTitle(/Sign Up/i);

    await authPage.signup(testUserNew.email, testUserNew.password);

    // Should create account and redirect
    await expect(authPage.page).toHaveURL(/dashboard|welcome/);
  });
});
