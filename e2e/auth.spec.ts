import { test, expect } from '@playwright/test';
import { mockFirebaseUnauthenticated } from './helpers/mock-auth';

test.describe('Auth Screen', () => {
  test.beforeEach(async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
  });

  test('page loads with sign-in form', async ({ page }) => {
    // Header
    await expect(page.locator('h1')).toContainText('Linked Fitness');
    await expect(page.locator('.tagline')).toContainText(
      'Train together when you can',
    );

    // Sign-in form fields
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Password"]')).toBeVisible();

    // Sign In button
    await expect(page.locator('.btn-primary')).toContainText('Sign In');
  });

  test('can toggle between sign-in and sign-up modes', async ({ page }) => {
    // Start in sign-in mode
    await expect(page.locator('.btn-primary')).toContainText('Sign In');
    await expect(page.locator('.switch-mode')).toContainText('No account?');

    // Click "Sign up" link
    await page.locator('.link-btn', { hasText: 'Sign up' }).click();

    // Now in sign-up mode
    await expect(page.locator('.btn-primary')).toContainText('Create Account');
    await expect(page.locator('.switch-mode')).toContainText(
      'Already have an account?',
    );

    // Click "Sign in" link to go back
    await page.locator('.link-btn', { hasText: 'Sign in' }).click();

    // Back to sign-in mode
    await expect(page.locator('.btn-primary')).toContainText('Sign In');
  });

  test('sign-up form shows display name field', async ({ page }) => {
    // Switch to sign-up mode
    await page.locator('.link-btn', { hasText: 'Sign up' }).click();

    // Display name field should be visible
    await expect(
      page.locator('input[placeholder="Display name"]'),
    ).toBeVisible();

    // Email and password still present
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible();
    await expect(
      page.locator('input[placeholder="Password (min 6 characters)"]'),
    ).toBeVisible();
  });

  test('form validation shows error for empty display name on sign-up', async ({
    page,
  }) => {
    // Switch to sign-up mode
    await page.locator('.link-btn', { hasText: 'Sign up' }).click();

    // Fill email and password but leave display name empty
    await page.locator('input[placeholder="Email"]').fill('test@example.com');
    await page
      .locator('input[placeholder="Password (min 6 characters)"]')
      .fill('password123');

    // Click Create Account
    await page.locator('.btn-primary', { hasText: 'Create Account' }).click();

    // Error message should appear
    await expect(page.locator('.error-msg')).toContainText(
      'Display name is required',
    );
  });

  test('Google sign-in button is present', async ({ page }) => {
    const googleBtn = page.locator('.btn-google');
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toContainText('Continue with Google');
  });
});
