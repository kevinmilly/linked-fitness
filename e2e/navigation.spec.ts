import { test, expect } from '@playwright/test';
import { mockFirebaseUnauthenticated } from './helpers/mock-auth';

test.describe('App Shell & Navigation', () => {
  test('unauthenticated users are redirected to /auth', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/today', { waitUntil: 'domcontentloaded' });
    // Auth guard should redirect to /auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });

  test('bottom nav is hidden for unauthenticated users', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.bottom-nav')).not.toBeVisible();
  });

  test('protected routes redirect to auth', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);

    for (const route of ['/plan', '/progress', '/partner', '/settings', '/history']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
    }
  });

  test('nav bar has correct structure in HTML', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    // The nav exists in the DOM but is hidden behind @if (auth.isAuthenticated())
    // Verify the auth screen renders without a nav
    const navItems = page.locator('.bottom-nav .nav-item');
    await expect(navItems).toHaveCount(0);
  });
});
