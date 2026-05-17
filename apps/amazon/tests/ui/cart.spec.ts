import { test, expect } from '@playwright/test';

// Demo UI tests. These run against example.com so the suite works end-to-end
// without a local app server. In a real project, baseURL would point at your
// app under test and these would interact with real DOM.

test.describe('Cart', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Example Domain/);
  });

  test('has expected heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Example Domain');
  });

  test('has working anchor link', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a').first();
    await expect(link).toHaveAttribute('href', /iana\.org/);
  });
});
