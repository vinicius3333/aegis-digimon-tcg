import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 906, height: 972 },
  { width: 390, height: 844 },
]) {
  test(`decision surfaces keep their bottom-left width and compact rails at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    let expectedSize: { width: number; height: number } | undefined;
    for (const specimen of [
      "decision-action-confirmation",
      "decision-optional-rail",
      "decision-choose-short",
      "decision-choose-long",
      "decision-select-cards",
      "decision-order-triggers",
      "decision-selection-rail",
      "decision-field-budget",
    ]) {
      await page.goto(`/dev/mobile?specimen=${specimen}&frame=1&locale=en`);
      const panel = page.locator("[data-prompt-surface]");
      await expect(panel).toBeVisible();
      const bounds = (await panel.boundingBox())!;
      expect(bounds.x).toBeCloseTo(viewport.width < 768 ? 0 : 8, 0);
      expect(bounds.y + bounds.height).toBeCloseTo(viewport.height - (viewport.width < 768 ? 0 : 8), 0);
      if (!expectedSize) expectedSize = { width: bounds.width, height: bounds.height };
      expect(bounds.width).toBeCloseTo(expectedSize.width, 0);
      if (await panel.getAttribute("data-variant")) {
        expect(bounds.height).toBeLessThanOrEqual(expectedSize.height);
      } else {
        expect(bounds.height).toBeCloseTo(expectedSize.height, 0);
      }
      if (specimen === "decision-action-confirmation" && viewport.width >= 768) {
        expect(await panel.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
      }
      const viewBoard = panel.getByRole("button", {
        name: specimen === "decision-field-budget" ? "Select on board" : "View board",
        exact: true,
      });
      if (specimen === "decision-field-budget") {
        const count = (await panel.getByText("1 selected of 0–3", { exact: true }).boundingBox())!;
        const budget = (await panel.getByRole("status").boundingBox())!;
        expect(budget.y).toBeGreaterThanOrEqual(count.y + count.height);
      }
      await viewBoard.click();
      await expect(page.getByRole("button", { name: "Return to decision", exact: true })).toBeVisible();
    }
  });
}
