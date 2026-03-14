import { expect, test } from '@playwright/test';

test.describe('App smoke tests', () => {
  test('homepage loads without crashing', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.status()).toBeLessThan(400);
    // Page should have some content rendered
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForTimeout(2000);
    // Filter out known non-critical errors (e.g. missing env vars)
    const critical = errors.filter((e) => !e.includes('Proxy not enabled'));
    expect(critical).toHaveLength(0);
  });

  test('navigating to unknown route does not crash', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-12345');
    // Should either 200 (SPA fallback) or 404, but not 500
    expect(response.status()).not.toBe(500);
  });
});

test.describe('Static assets', () => {
  test('CSS loads correctly', async ({ page }) => {
    await page.goto('/');
    const styles = await page.evaluate(() => document.styleSheets.length);
    expect(styles).toBeGreaterThan(0);
  });

  test('JS bundle executes', async ({ page }) => {
    await page.goto('/');
    const hasReactRoot = await page.evaluate(() => !!document.getElementById('root'));
    expect(hasReactRoot).toBe(true);
  });
});
