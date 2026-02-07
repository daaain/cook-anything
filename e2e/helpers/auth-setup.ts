import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Sets up authentication by navigating to settings, saving a token,
 * selecting the haiku model, and navigating back to the home page.
 */
export async function setupAuth(page: Page, token: string): Promise<void> {
  await page.goto('/');

  // Assert auth warning is visible
  await expect(page.getByText('Authentication required')).toBeVisible();

  // Navigate to settings via the warning link
  await page
    .getByRole('link', { name: /settings/i })
    .first()
    .click();
  await page.waitForURL('**/settings');

  // Fill token and save
  await page.locator('#token').fill(token);
  await page.getByRole('button', { name: 'Save Token' }).click();

  // Wait for authenticated confirmation
  await expect(page.getByText('Authenticated')).toBeVisible();

  // Select haiku model
  await page.locator('input[name="model"][value="haiku"]').check();

  // Navigate back to home
  await page.getByRole('link', { name: /home/i }).click();
  await page.waitForURL('/');

  // Assert auth warning is gone
  await expect(page.getByText('Authentication required')).not.toBeVisible();
}
