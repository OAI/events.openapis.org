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

test.describe('Live event phase', () => {
  test('every event reads as finished once its dates are in the past', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2099-01-01T12:00:00'));
    await page.goto('/');

    const cards = page.locator('[data-phase]');
    await expect(cards.first()).toBeAttached();
    await expect
      .poll(() => page.locator('[data-phase="upcoming"], [data-phase="ongoing"]').count())
      .toBe(0);
  });

  test('an event in progress says it is happening now', async ({ page }) => {
    await page.goto('/');

    const featured = page.locator('[data-phase][data-start][data-end]').first();
    await expect(featured).toBeAttached();
    const start = await featured.getAttribute('data-start');
    const end = await featured.getAttribute('data-end');
    expect(start, 'featured card should carry a parsed start date').toBeTruthy();
    expect(new Date(end!).getTime()).toBeGreaterThan(new Date(start!).getTime());

    // A minute past the opening bell — inside the window whatever the event is.
    await page.clock.setFixedTime(new Date(new Date(start!).getTime() + 60_000));
    await page.reload();

    const live = page.locator('[data-phase][data-start="' + start + '"]').first();
    await expect(live).toHaveAttribute('data-phase', 'ongoing');
    await expect(live.getByText('Happening now', { exact: true })).toBeVisible();
  });
});

test.describe('Agenda day deep links', () => {
  test('the selected day is mirrored into ?day= and restored from it', async ({ page }) => {
    // Find a multi-day event among those the homepage links to, for the same
    // reason the smoke test above avoids a hardcoded slug.
    await page.goto('/');
    const hrefs = await page
      .locator('a[href^="/events/"]:not([href*="/events/talks/"])')
      .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute('href')!))]);
    const dayTabs = page.locator('button[aria-pressed]');
    let eventPath: string | undefined;
    for (const href of hrefs) {
      await page.goto(href);
      if ((await dayTabs.count()) > 1) {
        eventPath = new URL(page.url()).pathname;
        break;
      }
    }
    test.skip(!eventPath, 'no multi-day event is linked from the homepage');

    const [first, second] = [dayTabs.nth(0), dayTabs.nth(1)];
    const dayKey = (await second.innerText())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '');

    // Picking a later day names it in the URL...
    await second.click();
    await expect(page).toHaveURL(`${eventPath}?day=${dayKey}`);
    await expect(second).toHaveAttribute('aria-pressed', 'true');

    // ...and that URL opens on it.
    await page.reload();
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    await expect(first).toHaveAttribute('aria-pressed', 'false');

    // The first day is the default, so it gets the bare URL back.
    await first.click();
    await expect(page).toHaveURL(eventPath!);
    await expect(first).toHaveAttribute('aria-pressed', 'true');
  });
});
