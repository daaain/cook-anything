import { readFileSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

/**
 * Live mode: intercepts the API call, passes it through to the real server,
 * saves the response JSON to a fixture file, then fulfils with the real response.
 */
export async function recordApiResponse(page: Page, fixturePath: string): Promise<void> {
  await page.route('**/api/process-recipe', async (route) => {
    const response = await route.fetch();
    const json = await response.json();

    writeFileSync(fixturePath, JSON.stringify(json, null, 2));

    await route.fulfill({
      status: response.status(),
      contentType: 'application/json',
      body: JSON.stringify(json),
    });
  });
}

/**
 * Replay mode: intercepts the API call and returns the saved fixture JSON
 * without making a real request.
 */
export async function replayApiResponse(page: Page, fixturePath: string): Promise<void> {
  const fixtureJson = readFileSync(fixturePath, 'utf-8');

  await page.route('**/api/process-recipe', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: fixtureJson,
    });
  });
}
