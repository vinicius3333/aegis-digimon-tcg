import { selectPrivateSealedFormat } from "./selectPrivateSealedFormat";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { startSealedBrowserServer } from "../../api/test-support/startSealedBrowserServer";

const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/copy";
let backend: Awaited<ReturnType<typeof startSealedBrowserServer>>;

test.beforeAll(async () => {
  backend = await startSealedBrowserServer({
    connectionString: process.env.SEALED_TEST_DATABASE_URL,
    port: Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569),
  });
});

test.afterAll(async () => {
  await backend?.close();
});

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`concise private and Swiss selection at ${width}px ${dark ? "dark" : "light"}`, async ({ page, context }) => {
      const theme = dark ? "dark" : "light";
      await page.addInitScript((value) => localStorage.setItem("aegis:darkMode", String(value)), dark);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/play");
      await selectPrivateSealedFormat({ page: page });
      await expect(page.getByRole("textbox", { name: "Player name", exact: true })).toHaveCount(0);
      const selector = page.getByRole("combobox", { name: "Booster series", exact: true });
      await selector.selectOption("BT26");
      await expect(page.locator(".sealed-product__art")).toHaveAttribute("src", "/sets/BT26.jpg");
      await expect(page.getByRole("button", { name: "Create", exact: true })).toBeEnabled();
      await expect(page.getByRole("tab", { name: "Join", exact: true })).toBeEnabled();
      await expect(page.locator(".private-sealed > p")).toHaveCount(0);
      await expect(page.locator(".sealed-product strong")).toHaveCount(0);
      await expect(page.locator(".sealed-product details")).not.toHaveAttribute("open");
      await expect(page.getByText("6 packs", { exact: true })).toBeVisible();
      const measurements = await page.locator(".private-sealed").evaluate((element) => ({
        overflow: element.scrollWidth > element.clientWidth,
        targets: Array.from(element.querySelectorAll("input, select, button, summary")).map((target) => ({
          label: target.textContent?.trim() || target.getAttribute("aria-label") || target.tagName,
          width: target.getBoundingClientRect().width,
          height: target.getBoundingClientRect().height,
        })),
      }));
      expect(measurements.overflow).toBe(false);
      expect(measurements.targets.every((target) => target.height >= 44 && target.width >= 44)).toBe(true);
      console.log(JSON.stringify({ width, theme, measurements }));
      await page.screenshot({ path: `${evidence}/private-${width}-${theme}.png`, fullPage: true });
      await page.getByText("Details", { exact: true }).click();
      await expect(page.getByText("Pack odds are estimated, not official Bandai odds.")).toBeVisible();
      await expect(page.locator(".sealed-product time")).toBeVisible();
      await page.screenshot({ path: `${evidence}/details-${width}-${theme}.png`, fullPage: true });
      await page.getByRole("tab", { name: "Join", exact: true }).click();
      await page.getByRole("textbox", { name: "Join code", exact: true }).fill("abcdef012345678901");
      await expect(page.getByRole("button", { name: "Join", exact: true })).toBeEnabled();
      await expect(selector).toHaveCount(0);
      await page.screenshot({ path: `${evidence}/join-${width}-${theme}.png`, fullPage: true });
      const owner = await backend.accounts.accountForIdentity("discord", randomUUID(), "Copy organizer");
      const session = await backend.accounts.issueSession(owner);
      await context.addCookies([{ name: "aegis_session", value: session.id, domain: "127.0.0.1", path: "/" }]);
      await page.goto("/tournaments/new");
      await page.getByRole("checkbox", { name: "Sealed Swiss · six packs", exact: true }).check();
      await selector.selectOption("EX13");
      await expect(page.getByText("6 packs", { exact: true })).toBeVisible();
      await expect(page.locator(".sealed-product details")).not.toHaveAttribute("open");
      expect(
        await page.locator(".sealed-product").evaluate((element) => element.scrollWidth > element.clientWidth),
      ).toBe(false);
      await page.screenshot({ path: `${evidence}/swiss-${width}-${theme}.png`, fullPage: true });
    });
  }
}
