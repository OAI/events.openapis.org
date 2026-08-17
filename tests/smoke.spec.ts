import { test, expect } from '@playwright/test';

test.describe('Smoke checks across pages', () => {
  for (const path of ['/', '/past-events', '/events/openapi-summit']) {
    test(`renders ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(/OpenAPI/i);
    });
  }
});
