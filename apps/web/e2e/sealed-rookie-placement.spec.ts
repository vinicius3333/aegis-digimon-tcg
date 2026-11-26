const evidence = process.env.AEGIS_SEALED_EVIDENCE_DIR ?? "test-results/sealed/rookie";
import { test, expect } from "./scenario-page";
import fixture from "@api-fixtures/sealed-rookie-placement.fixture";

for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`places a level three without On Play at ${width}px in ${dark ? "dark" : "light"}`, async ({
      page,
      scenario,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((value) => {
        localStorage.setItem("aegis:darkMode", String(value));
      }, dark);
      await scenario.openFixture(fixture, "normal", "none");
      const action = page.getByRole("button", { name: /Place in breeding.*Gabumon/i });
      await expect(action).toBeVisible();
      await expect.poll(() => action.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await expect(page.locator(".sealed-breeding-actions")).toHaveCSS("z-index", "21");
      await expect(page.getByText("Choose one breeding action, or end breeding.", { exact: true })).toBeVisible();
      await expect
        .poll(() =>
          page.getByText("Choose one breeding action, or end breeding.", { exact: true }).evaluate((element) => {
            const hint = element.getBoundingClientRect();
            const actions = document.querySelector(".sealed-breeding-actions")?.getBoundingClientRect();
            return (
              !!actions &&
              hint.width > 0 &&
              hint.height > 0 &&
              actions.width > 0 &&
              actions.height > 0 &&
              (hint.bottom <= actions.top ||
                actions.bottom <= hint.top ||
                hint.right <= actions.left ||
                actions.right <= hint.left)
            );
          }),
        )
        .toBe(true);
      const readControlGeometry = () =>
        page.locator(".sealed-breeding-actions").evaluate((actions) => {
          function rect(element: Element) {
            const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
            return { left, top, right, bottom, width, height };
          }
          const viewport = { width: innerWidth, height: innerHeight };
          const buttons = [...actions.querySelectorAll("button")].map(rect);
          const panelElement = actions.closest(".game-breeding-hint");
          const panel = panelElement ? rect(panelElement) : null;
          const board = actions.closest(".game-board");
          const utilityClearanceApplies =
            !!board?.matches('[data-organized-field]:not([data-board-style="arena3d"])') &&
            matchMedia("(width < 600px) and (orientation: portrait)").matches;
          const utilityLabels = utilityClearanceApplies
            ? [
                ...board!.querySelectorAll(
                  '.game-field :is([class*="game-utility-slot--you-"] .game-pile + span, [class*="game-utility-slot--you-"] .game-breeding-slot > span, .game-security-shield--you .game-security-shield__label)',
                ),
              ]
                .filter((element) => getComputedStyle(element).visibility !== "hidden")
                .map(rect)
                .filter((label) => label.width > 0 && label.height > 0)
            : [];
          return {
            viewport,
            buttons,
            panel,
            utilityClearanceApplies,
            utilityLabels,
            allActionsWithinViewport:
              buttons.length > 0 &&
              buttons.every(
                (button) =>
                  button.width > 0 &&
                  button.height > 0 &&
                  button.left >= 0 &&
                  button.top >= 0 &&
                  button.right <= viewport.width &&
                  button.bottom <= viewport.height,
              ),
            utilityLabelsClear:
              !utilityClearanceApplies ||
              (!!panel &&
                utilityLabels.length > 0 &&
                utilityLabels.every(
                  (label) =>
                    panel.bottom <= label.top ||
                    label.bottom <= panel.top ||
                    panel.right <= label.left ||
                    label.right <= panel.left,
                )),
          };
        });
      let geometry = await readControlGeometry();
      let geometryCheckFailed = false;
      try {
        await expect
          .poll(async () => {
            geometry = await readControlGeometry();
            return {
              allActionsWithinViewport: geometry.allActionsWithinViewport,
              utilityLabelsClear: geometry.utilityLabelsClear,
            };
          })
          .toEqual({ allActionsWithinViewport: true, utilityLabelsClear: true });
      } catch (error) {
        geometryCheckFailed = true;
        throw error;
      } finally {
        const attachment = test.info().attach("breeding-control-geometry", {
          body: JSON.stringify(geometry),
          contentType: "application/json",
        });
        if (geometryCheckFailed) await attachment.catch(() => undefined);
        else await attachment;
      }
      await page.screenshot({
        path: `${evidence}/rookie-breeding-controls-${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
      await action.click();
      await expect
        .poll(
          async () => (await page.evaluate(() => window.browserTestSnapshot())).players[0]?.breeding?.topCard?.cardId,
        )
        .toBe("BT1-029");
      await expect(action).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
      await page.screenshot({
        path: `${evidence}/rookie-breeding-${width}-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
      const snapshot = await page.evaluate(() => window.browserTestSnapshot());
      expect(snapshot.memory).toBe(3);
    });
  }
}
