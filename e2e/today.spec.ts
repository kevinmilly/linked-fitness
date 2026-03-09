import { test, expect } from '@playwright/test';
import { mockFirebaseUnauthenticated } from './helpers/mock-auth';

test.describe('Today Screen', () => {
  test('redirects unauthenticated users to /auth', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/today', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });

  test('root path redirects to /auth when unauthenticated', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Root redirects to /today which then redirects to /auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });

  test('auth page renders after redirect from /today', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/today', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });

    // Auth screen should be visible
    await expect(page.locator('h1')).toContainText('Linked Fitness');
    await expect(page.locator('input[placeholder="Email"]')).toBeVisible();
  });
});
