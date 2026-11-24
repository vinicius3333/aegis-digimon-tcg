import { expect, type Page } from "@playwright/test";

type Params = { page: Page };

export async function waitForPackOpeningScene({ page }: Params) {
  await expect
    .poll(async () => {
      await page.clock.fastForward(1000);
      return page.locator(".pack-opening canvas").isVisible();
    })
    .toBe(true);
}
