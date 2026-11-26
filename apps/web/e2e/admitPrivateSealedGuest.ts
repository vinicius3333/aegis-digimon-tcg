import { expect, type Page } from "@playwright/test";
import type { PrivateSealedView } from "@aegis/shared/sealed/private/PrivateSealedContracts";

type Params = { page: Page; api: string };

export async function admitPrivateSealedGuest({ page, api }: Params): Promise<PrivateSealedView> {
  const code = await page.getByTestId("private-sealed-code").innerText();
  const waiting = await page.request.get(`${api}/private-sealed/${code}`);
  expect(waiting.ok()).toBe(true);
  const before: PrivateSealedView = await waiting.json();
  expect(before.players).toHaveLength(1);
  expect(before.pool.packs).toEqual([]);
  await expect(page.getByText(/waiting for the second player/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your pool & deck", exact: true })).toHaveCount(0);
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  const context = await page.context().browser()!.newContext();
  let primary: unknown;
  let failed = false;
  let result: PrivateSealedView | undefined;
  try {
    const guest = await context.newPage();
    await guest.goto(new URL(`/play?privateSealed=${code}`, page.url()).href, {
      waitUntil: "domcontentloaded",
    });
    await guest.getByRole("button", { name: "Join", exact: true }).click();
    await expect(guest.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
    const joined = await guest.request.get(`${api}/private-sealed/${code}`);
    expect(joined.ok()).toBe(true);
    const other: PrivateSealedView = await joined.json();
    expect(other.seat).toBe(1);
    expect(other.players).toHaveLength(2);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
    const response = await page.request.get(`${api}/private-sealed/${code}`);
    expect(response.ok()).toBe(true);
    const own: PrivateSealedView = await response.json();
    expect(own.seat).toBe(0);
    expect(own.players).toHaveLength(2);
    expect(own.pool.configuration).toEqual(before.pool.configuration);
    expect(own.pool.packs).toHaveLength(6);
    expect(own.pool.packs.flat()).toHaveLength(72);
    result = own;
  } catch (error) {
    failed = true;
    primary = error;
  }
  try {
    await context.close();
  } catch (cleanupError) {
    if (failed)
      throw new AggregateError([primary, cleanupError], "Guest admission and context cleanup failed", {
        cause: primary,
      });
    throw cleanupError;
  }
  if (failed) throw primary;
  return result!;
}
