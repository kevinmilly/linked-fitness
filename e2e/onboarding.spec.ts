import { test, expect } from '@playwright/test';
import { mockFirebaseUnauthenticated } from './helpers/mock-auth';

test.describe('Onboarding Flow', () => {
  // Onboarding requires authentication. Without a real Firebase backend,
  // we verify the auth guard redirects properly and test what we can
  // from the auth screen's sign-up flow.

  test('onboarding route redirects unauthenticated users to /auth', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });

  test('sign-up form is the entry point to onboarding', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    // Switch to sign-up mode
    await page.locator('.link-btn', { hasText: 'Sign up' }).click();

    // Sign-up form should have display name (first step before onboarding)
    await expect(page.locator('input[placeholder="Display name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Password"]')).toBeVisible();

    // Create Account button should be present
    await expect(page.locator('.btn-primary', { hasText: 'Create Account' })).toBeVisible();
  });

  test('sign-up validates display name is required', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    // Switch to sign-up
    await page.locator('.link-btn', { hasText: 'Sign up' }).click();

    // Try to submit without display name
    await page.locator('input[placeholder="Email"]').fill('test@example.com');
    await page.locator('input[placeholder*="Password"]').fill('password123');
    await page.locator('.btn-primary', { hasText: 'Create Account' }).click();

    // Should show error about display name
    await expect(page.locator('.error-msg')).toContainText('Display name is required');
  });
});
