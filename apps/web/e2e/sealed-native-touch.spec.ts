import { selectPrivateSealedFormat } from "./selectPrivateSealedFormat";
import { waitForPackOpeningScene } from "./waitForPackOpeningScene";
import { pausePackOpeningAnimations } from "./pausePackOpeningAnimations";
import { togglePackOpeningCheckbox } from "./togglePackOpeningCheckbox";
import { activatePackOpeningButton } from "./activatePackOpeningButton";
import { mkdir, writeFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { startPrivateSealedBrowserServer } from "../../api/test-support/startPrivateSealedBrowserServer";
import type { PrivateSealedView } from "@aegis/shared/sealed/private/PrivateSealedContracts";

test.use({ trace: "off", video: "off" });

let backend: Awaited<ReturnType<typeof startPrivateSealedBrowserServer>>;
const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed-native-touch";
const api = `http://127.0.0.1:${process.env.AEGIS_E2E_EDGE_PORT ?? 2569}`;
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: Date.now() - 1000 });
});
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
type SwipeParams = { page: Page; x: number; from: number; to: number };
async function swipe({ page, x, from, to }: SwipeParams) {
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] });
  for (let step = 1; step <= 6; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: from + ((to - from) * step) / 6 }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await session.detach();
}
type PoolSwipeParams = { page: Page; down?: boolean };
async function swipePool({ page, down = true }: PoolSwipeParams) {
  const bounds = (await page.locator(".deck-card-pool").boundingBox())!;
  const top = Math.max(65, bounds.y) + 25;
  const bottom = Math.min(page.viewportSize()!.height - 110, bounds.y + bounds.height) - 20;
  expect(bottom - top).toBeGreaterThan(50);
  await swipe({ page, x: bounds.x + 30, from: down ? bottom : top, to: down ? top : bottom });
}
async function getAncestors(page: Page) {
  return page.locator(".deck-card-pool").evaluate((element) => {
    const result = [];
    for (let node: HTMLElement | null = element as HTMLElement; node; node = node.parentElement) {
      const css = getComputedStyle(node);
      result.push({
        node: node.className || node.tagName,
        overflow: css.overflow,
        touchAction: css.touchAction,
        inert: node.inert,
        height: node.clientHeight,
        scrollHeight: node.scrollHeight,
        scrollTop: node.scrollTop,
        bounds: node.getBoundingClientRect().toJSON(),
      });
    }
    return result;
  });
}
for (const height of [844, 540]) {
  for (const dark of [false, true]) {
    test.describe(`390x${height} ${dark ? "dark reduced" : "light full"}`, () => {
      test.use({
        viewport: { width: 390, height },
        isMobile: true,
        hasTouch: true,
        reducedMotion: dark ? "reduce" : "no-preference",
      });
      test("native swipes reach the entire allocation after original booster and deck sheet teardown", async ({
        page,
      }) => {
        const prefix = `${evidence}/native-${height}-${dark ? "dark" : "light"}`;
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript((value) => localStorage.setItem("aegis:darkMode", String(value)), dark);
        await page.goto("/play");
        const modes = page.locator(".lobby-modes");
        await expect(modes.locator(".lobby-mode")).toHaveCount(3);
        await modes.screenshot({ path: `${prefix}-modes.png` });
        await selectPrivateSealedFormat({ page, touch: true });
        await expect(modes.getByRole("button", { name: /Private Match/ })).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("button", { name: "Enter queue", exact: true })).toHaveCount(0);
        await expect(page.getByRole("textbox", { name: "Player name", exact: true })).toHaveCount(0);
        await page.getByRole("combobox", { name: "Booster series", exact: true }).selectOption(dark ? "BT26" : "EX13");
        await page.screenshot({ path: `${prefix}-selection.png` });
        await page.getByRole("button", { name: "Create", exact: true }).tap();
        await expect(page.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
        await expect(page.locator("[data-pool-card]")).toHaveCount(0);
        const code = await page.getByTestId("private-sealed-code").innerText();
        const own: PrivateSealedView = await (await page.request.get(`${api}/private-sealed/${code}`)).json();
        expect(own.pool.packs).toHaveLength(6);
        expect(own.pool.packs.flat()).toHaveLength(72);
        const soloBefore = await page.evaluate(() => localStorage.getItem("aegis:booster-progress:v2"));
        await pausePackOpeningAnimations({ page });
        await page.getByRole("button", { name: "Open packs", exact: true }).tap();
        const stage = page.locator(".pack-opening");
        await waitForPackOpeningScene({ page });
        await expect(stage.locator("canvas")).toBeVisible();
        await expect(page.getByRole("combobox", { name: "Booster set", exact: true })).toBeDisabled();
        await writeFile(
          `${prefix}-opening-controls.json`,
          JSON.stringify(
            await stage.evaluate((element) => ({
              viewport: { width: innerWidth, height: innerHeight },
              scrollLeft: element.scrollLeft,
              controls: [
                ...element.querySelectorAll<HTMLElement>(
                  ".pack-opening__toggles label, .pack-opening__set, .pack-opening__fullscreen",
                ),
              ].map((control) => ({
                text: control.textContent,
                display: getComputedStyle(control).display,
                bounds: control.getBoundingClientRect().toJSON(),
              })),
            })),
            null,
            2,
          ),
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await togglePackOpeningCheckbox({ page, name: "Skip animations" });
        await activatePackOpeningButton({ page, name: "Open all packs (6)" });
        await expect(page.locator(".pack-result-card")).toHaveCount(72);
        expect(
          await page.locator(".pack-result-card").evaluateAll((elements) =>
            elements.map((element) => ({
              cardId: (element as HTMLElement).dataset.cardId,
              artId: (element as HTMLElement).dataset.artId,
            })),
          ),
        ).toEqual(
          own.pool.packs
            .slice(0, 6)
            .flat()
            .map((card) => ({ cardId: card.cardId, artId: card.artId ?? card.cardId })),
        );
        await expect(page.getByRole("button", { name: "Start next box", exact: true })).toHaveCount(0);
        await activatePackOpeningButton({ page, name: "Back to deck building" });
        await page.getByRole("button", { name: "Open packs", exact: true }).tap();
        await expect(stage).toHaveAttribute("data-phase", "summary");
        await expect(page.locator(".pack-result-card")).toHaveCount(72);
        await activatePackOpeningButton({ page, name: "Back to deck building" });
        await page.clock.resume();
        const pool = page.locator(".deck-card-pool");
        await pool.scrollIntoViewIfNeeded();
        const ancestors = await getAncestors(page);
        await writeFile(`${prefix}-ancestors.json`, JSON.stringify(ancestors, null, 2));
        expect(ancestors[0]!.height).toBeLessThan(ancestors[0]!.scrollHeight);
        const before = await pool.evaluate((element) => element.scrollTop);
        await swipePool({ page });
        await expect.poll(() => pool.evaluate((element) => element.scrollTop)).toBeGreaterThan(before + 50);
        await expect(page.locator(".deck-pool-card-stepper")).toHaveCount(0);
        for (let attempt = 0; attempt < 35; attempt++) {
          const remaining = await pool.evaluate(
            (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
          );
          if (remaining < 2) {
            break;
          }
          await swipePool({ page });
        }
        await expect
          .poll(() => pool.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop))
          .toBeLessThan(2);
        await expect(pool.locator("[data-pool-card]")).toHaveCount(
          new Set(own.pool.packs.flat().map((card) => card.cardId)).size,
        );
        await expect(page.locator(".deck-pool-card-stepper")).toHaveCount(0);
        const last = pool.locator("[data-pool-card]").last();
        const lastCardId = await last.getAttribute("data-pool-card");
        await page.screenshot({ path: `${prefix}-pool-bottom.png` });
        await last.getByRole("button", { name: "Add", exact: true }).tap();
        await expect(last.locator(".deck-pool-card-stepper")).toBeVisible();
        await page.getByRole("button", { name: /^View deck/ }).tap();
        await expect(page.getByRole("complementary", { name: "Deck information", exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Close deck panel", exact: true }).tap();
        for (let attempt = 0; attempt < 35; attempt++) {
          if ((await pool.evaluate((element) => element.scrollTop)) < 2) {
            break;
          }
          await swipePool({ page, down: false });
        }
        await expect.poll(() => pool.evaluate((element) => element.scrollTop)).toBeLessThan(2);
        await expect(page.getByRole("button", { name: "Ready", exact: true })).toBeVisible();
        const ready = await page.getByRole("button", { name: "Ready", exact: true }).evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          return element === hit || element.contains(hit);
        });
        expect(ready).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(await page.evaluate(() => localStorage.getItem("aegis:booster-progress:v2"))).toBe(soloBefore);
        await page.screenshot({ path: `${prefix}-pool-top.png` });
        await writeFile(
          `${prefix}-result.json`,
          JSON.stringify(
            { lastCardId, poolCards: own.pool.packs.flat().length, readyUncovered: ready, errors },
            null,
            2,
          ),
        );
        expect(errors).toEqual([]);
      });
    });
  }
}

for (const dark of [false, true]) {
  test(`desktop sealed shares the original engine and preserves allocation ${dark ? "dark" : "light"}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript((value) => localStorage.setItem("aegis:darkMode", String(value)), dark);
    await page.goto("/play");
    const modes = page.locator(".lobby-modes");
    await expect(modes.locator(".lobby-mode")).toHaveCount(3);
    const bounds = await modes
      .locator(".lobby-mode")
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
    expect(Math.max(...bounds.map((value) => value.y)) - Math.min(...bounds.map((value) => value.y))).toBeLessThan(2);
    await modes.screenshot({ path: `${evidence}/desktop-${dark ? "dark" : "light"}-modes.png` });
    await selectPrivateSealedFormat({ page });
    await page.getByRole("combobox", { name: "Booster series", exact: true }).selectOption("BT26");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your pool & deck", exact: true })).toBeVisible();
    await expect(page.locator("[data-pool-card]")).toHaveCount(0);
    const code = await page.getByTestId("private-sealed-code").innerText();
    const own: PrivateSealedView = await (await page.request.get(`${api}/private-sealed/${code}`)).json();
    await pausePackOpeningAnimations({ page });
    await page.getByRole("button", { name: "Open packs", exact: true }).click();
    await togglePackOpeningCheckbox({ page, name: "Skip animations" });
    await activatePackOpeningButton({ page, name: "Open all packs (6)" });
    await expect(page.locator(".pack-opening")).toHaveAttribute("data-phase", "summary");
    await expect(page.locator(".pack-result-card")).toHaveCount(72);
    expect(
      await page.locator(".pack-result-card").evaluateAll((elements) =>
        elements.map((element) => ({
          cardId: (element as HTMLElement).dataset.cardId,
          artId: (element as HTMLElement).dataset.artId,
        })),
      ),
    ).toEqual(own.pool.packs.flat().map((card) => ({ cardId: card.cardId, artId: card.artId ?? card.cardId })));
    await page.screenshot({ path: `${evidence}/desktop-${dark ? "dark" : "light"}-summary.png` });
    await activatePackOpeningButton({ page, name: "Back to deck building" });
    await page.clock.resume();
    await expect(page.getByRole("button", { name: "Open packs", exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "Ready", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem("aegis:booster-progress:v2"))).toBeNull();
  });
  test(`desktop solo retains original box controls ${dark ? "dark" : "light"}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript((value) => localStorage.setItem("aegis:darkMode", String(value)), dark);
    await page.goto("/booster");
    const select = page.getByRole("combobox", { name: "Booster set", exact: true });
    await expect(select).toBeEnabled();
    await expect(select.locator("option")).toHaveCount(37);
    await select.selectOption("BT26");
    await togglePackOpeningCheckbox({ page, name: "Skip animations" });
    await activatePackOpeningButton({ page, name: "Open pack" });
    await expect(page.locator(".pack-opening")).toHaveAttribute("data-phase", "summary");
    await expect(page.locator(".pack-result-card")).toHaveCount(12);
    await expect(page.getByText("1 / 24 packs opened", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem("aegis:booster-progress:v2")!).activeBox.packs.length),
    ).toBe(1);
    await activatePackOpeningButton({ page, name: "Full screen" });
    await expect(page.locator(".pack-opening")).toHaveAttribute("data-immersive", "true");
    await activatePackOpeningButton({ page, name: "Exit full screen" });
    await togglePackOpeningCheckbox({ page, name: "Foil effects" });
    await expect(page.getByRole("checkbox", { name: "Foil effects", exact: true })).not.toBeChecked();
  });
}
