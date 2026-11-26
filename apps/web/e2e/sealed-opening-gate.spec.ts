import { selectPrivateSealedFormat } from "./selectPrivateSealedFormat";
import { admitPrivateSealedGuest } from "./admitPrivateSealedGuest";
import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { startPrivateSealedBrowserServer } from "../../api/test-support/startPrivateSealedBrowserServer";
import type { PrivateSealedView } from "@aegis/shared/sealed/private/PrivateSealedContracts";
import { pausePackOpeningAnimations } from "./pausePackOpeningAnimations";
import { waitForPackOpeningScene } from "./waitForPackOpeningScene";
import { activatePackOpeningButton } from "./activatePackOpeningButton";
import { togglePackOpeningCheckbox } from "./togglePackOpeningCheckbox";

const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed-opening-gate";
const api = `http://127.0.0.1:${process.env.AEGIS_E2E_EDGE_PORT ?? 2569}`;
let backend: Awaited<ReturnType<typeof startPrivateSealedBrowserServer>>;
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, trace: "off" });
test.beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
  backend = await startPrivateSealedBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
});
test.afterAll(async () => {
  await backend?.close();
});

test("keeps unfinished reveals empty through reload and admits only completed packs", async ({ page }) => {
  await page.clock.install({ time: Date.now() - 1000 });
  await page.goto("/play");
  await selectPrivateSealedFormat({ page: page });
  await expect(page.getByRole("textbox", { name: "Player name", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const own = await admitPrivateSealedGuest({ page, api });
  const code = own.code;
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  await expect(page.locator(".deck-builder-page")).toHaveCount(0);
  await pausePackOpeningAnimations({ page });
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  await waitForPackOpeningScene({ page });
  const stage = page.locator(".pack-opening");
  await page.clock.resume();
  await expect(stage).toHaveAttribute("data-phase", "choosing");
  await pausePackOpeningAnimations({ page });
  await activatePackOpeningButton({ page, name: "Open pack" });
  await expect(stage).toHaveAttribute("data-phase", "charging");
  await expect(page.getByText("Opened packs (1)", { exact: true })).toHaveCount(0);
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  await page.clock.resume();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Your pool & deck", exact: true })).toBeVisible();
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  await pausePackOpeningAnimations({ page });
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  await waitForPackOpeningScene({ page });
  await page.clock.resume();
  await expect(stage).toHaveAttribute("data-phase", "revealing");
  await pausePackOpeningAnimations({ page });
  await expect(page.locator(".pack-opening__count")).toHaveText("1 / 12");
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  await page.clock.resume();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Your pool & deck", exact: true })).toBeVisible();
  await expect(page.locator("[data-pool-card]")).toHaveCount(0);
  await pausePackOpeningAnimations({ page });
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  await waitForPackOpeningScene({ page });
  await expect(stage).toHaveAttribute("data-phase", "revealing");
  await expect(page.locator(".pack-opening__count")).toHaveText("1 / 12");
  for (let card = 2; card <= 12; card++) {
    await activatePackOpeningButton({ page, name: "Next card" });
    await expect(page.locator(".pack-opening__count")).toHaveText(`${card} / 12`);
  }
  await expect(page.getByText("Opened packs (1)", { exact: true })).toHaveCount(0);
  await activatePackOpeningButton({ page, name: "Finish" });
  await expect(page.locator(".pack-result-card")).toHaveCount(12);
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  await page.clock.resume();
  await expect(page.locator(".sealed-builder__header")).toContainText("1 / 6 packs opened");
  await page.getByRole("button", { name: /^View deck/ }).click();
  await expect(page.getByText("40 main cards remaining · Sideboard 12", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Close deck panel", exact: true }).click();
  expect(
    await page
      .locator("[data-pool-card]")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-pool-card")).sort()),
  ).toEqual([...new Set(own.pool.packs[0]!.map((pull) => pull.cardId))].sort());
  await page.screenshot({ path: `${evidence}/one-opened-mobile.png` });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".sealed-builder__header")).toContainText("1 / 6 packs opened");
  await pausePackOpeningAnimations({ page });
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  await waitForPackOpeningScene({ page });
  await togglePackOpeningCheckbox({ page, name: "Skip animations" });
  await activatePackOpeningButton({ page, name: "Open another pack" });
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  await page.clock.resume();
  await expect(page.locator(".sealed-builder__header")).toContainText("2 / 6 packs opened");
  await page.getByRole("button", { name: /^View deck/ }).click();
  await expect(page.getByText("40 main cards remaining · Sideboard 24", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Close deck panel", exact: true }).click();
  await pausePackOpeningAnimations({ page });
  await page.getByRole("button", { name: "Open packs", exact: true }).click();
  await waitForPackOpeningScene({ page });
  await togglePackOpeningCheckbox({ page, name: "Skip animations" });
  await activatePackOpeningButton({ page, name: "Open all packs (4)" });
  await activatePackOpeningButton({ page, name: "Back to deck building" });
  await page.clock.resume();
  await expect(page.locator(".sealed-builder__header")).toContainText("6 / 6 packs opened");
  await page.getByRole("button", { name: /^View deck/ }).click();
  await expect(page.getByText("40 main cards remaining · Sideboard 72", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Close deck panel", exact: true }).click();
  expect(
    ((await (await page.request.get(`${api}/private-sealed/${code}`)).json()) as PrivateSealedView).pool.packs,
  ).toEqual(own.pool.packs);
});
