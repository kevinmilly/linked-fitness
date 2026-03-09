import { test, expect } from '@playwright/test';
import { mockFirebaseUnauthenticated, navigateAuthenticated } from './helpers/mock-auth';

test.describe('Visual Regression Basics', () => {
  test('dark theme background color is applied', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    const body = page.locator('body');
    const bgColor = await body.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    // #0f0f0f = rgb(15, 15, 15)
    expect(bgColor).toBe('rgb(15, 15, 15)');
  });

  test('green accent color is used for primary buttons', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    const signInBtn = page.locator('.btn-primary');
    const bgColor = await signInBtn.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    // #4ade80 = rgb(74, 222, 128)
    expect(bgColor).toBe('rgb(74, 222, 128)');
  });

  test('touch targets meet minimum 44px height', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    // Check all buttons have at least 44px height
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const isVisible = await btn.isVisible();
      if (!isVisible) continue;

      const box = await btn.boundingBox();
      if (box) {
        expect(
          box.height,
          `Button ${i} height should be >= 44px (got ${box.height}px)`,
        ).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('no horizontal overflow on mobile viewport', async ({ page }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasOverflow).toBe(false);
  });

  test('text colors use light values for dark theme readability', async ({
    page,
  }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    // Main heading should use light color (#f5f5f5 = rgb(245, 245, 245))
    const h1Color = await page
      .locator('h1')
      .evaluate((el) => getComputedStyle(el).color);
    expect(h1Color).toBe('rgb(245, 245, 245)');
  });

  test('inputs have dark background for dark theme consistency', async ({
    page,
  }) => {
    await mockFirebaseUnauthenticated(page);
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });

    const input = page.locator('.input').first();
    const bgColor = await input.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    // #1a1a1a = rgb(26, 26, 26)
    expect(bgColor).toBe('rgb(26, 26, 26)');
  });
});
