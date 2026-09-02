import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly signupButton: Locator;
  readonly logoutButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.locator('button:has-text("Login")');
    this.signupButton = page.locator('button:has-text("Sign Up")');
    this.logoutButton = page.locator('button:has-text("Logout")');
    this.errorMessage = page.locator('[role="alert"]');
    this.successMessage = page.locator('[role="status"]');
  }

  async navigateToLogin() {
    await this.navigate('/login');
    await this.waitForPageLoad();
  }

  async navigateToSignup() {
    await this.navigate('/signup');
    await this.waitForPageLoad();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.waitForPageLoad();
  }

  async signup(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signupButton.click();
    await this.waitForPageLoad();
  }

  async logout() {
    await this.logoutButton.click();
    await this.waitForPageLoad();
  }

  async isLoggedIn() {
    return this.logoutButton.isVisible();
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }

  async getSuccessMessage() {
    return this.successMessage.textContent();
  }
}
