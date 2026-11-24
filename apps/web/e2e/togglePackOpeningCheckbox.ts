import type { Page } from "@playwright/test";

type Params = { page: Page; name: string };

export async function togglePackOpeningCheckbox({ page, name }: Params) {
  await page.getByRole("checkbox", { name, exact: true }).focus();
  await page.keyboard.press("Space");
}
