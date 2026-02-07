import path from 'node:path';
import { expect, test } from '@playwright/test';
import { recordApiResponse, replayApiResponse } from './helpers/api-mock';
import { setupAuth } from './helpers/auth-setup';

const isLive = !!process.env.E2E;
const fixturePath = path.join(__dirname, 'fixtures', 'simple-recipe.json');

test.describe('UI recipe flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so each test starts fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('full recipe flow: settings → create → view recipe', async ({ page }) => {
    // Determine token based on mode
    const token = isLive
      ? (() => {
          const t = process.env.CLAUDE_CODE_OAUTH_TOKEN;
          if (!t) throw new Error('CLAUDE_CODE_OAUTH_TOKEN is required for live e2e tests');
          return t;
        })()
      : 'dummy-token-for-replay';

    // Set up record or replay
    if (isLive) {
      await recordApiResponse(page, fixturePath);
    } else {
      await replayApiResponse(page, fixturePath);
    }

    // Authenticate
    await setupAuth(page, token);

    // Fill in recipe request
    await page.locator('#adjustments').fill('Simple buttered toast');
    await page.locator('#allow-clarifying').uncheck();

    // Submit
    await page.getByRole('button', { name: 'Create Recipe Flow' }).click();

    // Wait for navigation to recipe page
    await page.waitForURL('**/recipe?slug=*', { timeout: 120_000 });

    // Assert recipe title is visible
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();
    await expect(title).not.toBeEmpty();

    // Assert flow groups and steps are rendered
    // Steps have step number badges (1, 2, 3...) - check at least one exists
    await expect(
      page.locator('[class*="rounded-full"]').filter({ hasText: /^\d+$/ }).first(),
    ).toBeVisible();
  });
});
