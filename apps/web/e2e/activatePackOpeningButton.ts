import type { Page } from "@playwright/test";

type Params = { page: Page; name: string };

export async function activatePackOpeningButton({ page, name }: Params) {
  await page.getByRole("button", { name, exact: true }).focus();
  await page.keyboard.press("Enter");
}
