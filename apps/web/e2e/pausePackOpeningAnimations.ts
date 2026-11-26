import type { Page } from "@playwright/test";

type Params = { page: Page };

export async function pausePackOpeningAnimations({ page }: Params) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const browserTime = await page.evaluate(() => Date.now());
    try {
      await page.clock.pauseAt(Math.max(Date.now(), browserTime) + 1000);
      return;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Cannot fast-forward to the past") || attempt === 1) {
        throw error;
      }
    }
  }
}
