import { test, expect } from '@playwright/test';

test.describe('Checkout', () => {
  test('guest checkout page renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  // Intentional failure to demonstrate red status in the Execution view.
  test('demo: this one fails on purpose', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('This will never match');
  });
});
