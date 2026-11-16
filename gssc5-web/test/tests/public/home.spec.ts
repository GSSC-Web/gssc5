import { expect, test } from '@playwright/test';

test.describe('public home smoke', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('gssc-root')).toBeVisible();
    await expect(page.locator('.gssc-app-root')).toBeVisible();
    await expect(page.locator('[data-slot="header"]')).toBeVisible();
    await expect(page.locator('.gssc-home-page')).toBeVisible();
  });
});
