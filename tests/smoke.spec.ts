import { test, expect } from '@playwright/test';

test.describe('Smoke checks across pages', () => {
  for (const path of ['/', '/past-events']) {
    test(`renders ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(/OpenAPI/i);
    });
  }

  // Reached through whichever event the homepage lists first, rather than a
  // hardcoded slug: events come and go from data/, and with `output: export` a
  // slug that no longer exists fails as a 500 ("missing param in
  // generateStaticParams()"), not a 404 — so a stale literal here rots into a
  // confusing failure. Talk links share the /events/ prefix, hence the filter.
  test('renders the first event linked from the homepage', async ({ page }) => {
    await page.goto('/');
    const href = await page
      .locator('a[href^="/events/"]:not([href*="/events/talks/"])')
      .first()
      .getAttribute('href');

    expect(href, 'homepage should link to at least one event').toBeTruthy();

    await page.goto(href!);
    await expect(page).toHaveTitle(/OpenAPI/i);
  });
});
