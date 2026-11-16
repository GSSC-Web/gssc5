import { expect, test } from '@playwright/test';

test.describe('members login gate smoke', () => {
  test('logged-out visit to home redirects to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('.gssc-login-page')).toBeVisible();
    await expect(page.locator('.gssc-login-page__identity-control')).toBeVisible();
    await expect(page.locator('.gssc-login-page__password-control')).toBeVisible();
    await expect(page.locator('.gssc-login-page__submit')).toBeVisible();
  });
});
