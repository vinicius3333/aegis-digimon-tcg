import { expect, test, type Locator, type Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 599, height: 844 },
  { width: 600, height: 844 },
  { width: 673, height: 841 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 844, height: 390 },
  { width: 959, height: 1000 },
  { width: 960, height: 1000 },
  { width: 1440, height: 1000 },
];

async function searchGaiomon(page: Page) {
  const filters = page.getByRole("button", { name: "Filters", exact: true });
  if (await filters.isVisible()) await filters.click();
  await page.locator('input[name="cardSearch"]').fill("EX4-048");
  const apply = page.getByRole("button", { name: /^Show \d+ cards$/ });
  if (await apply.isVisible()) await apply.click();
}

async function expectReachable(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  const geometry = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return {
      x,
      y,
      left: rect.left,
      right: rect.right,
      width: innerWidth,
      height: innerHeight,
      hit: element.contains(document.elementFromPoint(x, y)),
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width);
  expect(geometry.y).toBeGreaterThanOrEqual(0);
  expect(geometry.y).toBeLessThan(geometry.height);
  expect(geometry.hit, JSON.stringify(geometry)).toBe(true);
}

async function expectNoFloatingPreview(page: Page) {
  // The current hover preview is body-portalled, outside every detail dialog.
  // Checking paint as well as hit targets catches pointer-events:none obstruction.
  const floating = await page.evaluate(async () => {
    // Observe the paint after React handles the pointer event, not an earlier DOM.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return Array.from(document.body.querySelectorAll<HTMLElement>("div")).filter(
      (element) => element.style.position === "fixed" && element.style.zIndex === "9999",
    ).length;
  });
  expect(floating).toBe(0);
}

for (const pointer of ["mouse", "touch"] as const) {
  test.describe(pointer, () => {
    test.use({ hasTouch: pointer === "touch" });
    for (const viewport of viewports) {
      test(`1557582869973696582: detail artwork stays reachable at ${viewport.width}x${viewport.height}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
        await page.goto("/e2e/deck-builder.html");
        await searchGaiomon(page);
        await page.getByRole("button", { name: "Add", exact: true }).click();
        const sheet = page.getByRole("button", { name: /Tap to see more about the deck/ });
        if (await sheet.isVisible()) await sheet.click();
        await page.getByRole("button", { name: "Gaiomon, 1 in deck" }).click();
        const drawer = page.getByRole("dialog", { name: "Card detail", exact: true });
        await expect(drawer).toBeVisible();
        const media = await page.evaluate(() => ({
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
          hover: matchMedia("(hover: hover)").matches,
          fine: matchMedia("(pointer: fine)").matches,
          coarse: matchMedia("(pointer: coarse)").matches,
          anyFine: matchMedia("(any-pointer: fine)").matches,
          anyCoarse: matchMedia("(any-pointer: coarse)").matches,
        }));
        await testInfo.attach("viewport-media", {
          body: JSON.stringify(media),
          contentType: "application/json",
        });
        expect(media.fine).toBe(pointer === "mouse");
        expect(media.coarse).toBe(pointer === "touch");
        // The first image is the full detail image, followed by art-choice images.
        const fullImage = drawer.getByRole("img", { name: "Gaiomon", exact: true }).first();
        if (pointer === "mouse") await fullImage.hover();
        else await fullImage.tap();
        await expectNoFloatingPreview(page);
        const artwork = drawer.getByRole("group", { name: "Artwork", exact: true });
        await expect(artwork.getByRole("button")).toHaveCount(4);
        for (const name of ["Original", "Alternate 1"]) {
          const choice = artwork.getByRole("button", { name, exact: true });
          await expectReachable(choice);
          if (pointer === "mouse") await choice.getByRole("img").hover();
          else await choice.tap();
          await expectNoFloatingPreview(page);
          await choice.click();
          await expect(choice).toHaveAttribute("aria-pressed", "true");
        }
        // Fold with the drawer open, then restore the original width.
        await page.setViewportSize({ width: viewport.width < 600 ? 673 : 390, height: 844 });
        await expectReachable(drawer.getByRole("button", { name: "Alternate 1", exact: true }));
        await expectNoFloatingPreview(page);
        await page.setViewportSize(viewport);
        const add = drawer.getByRole("button", { name: "Add Gaiomon", exact: true });
        await expectReachable(add);
        await add.click();
        await expect(drawer.getByLabel("2 in deck", { exact: true })).toHaveText("2");
        const remove = drawer.getByRole("button", { name: "Remove Gaiomon", exact: true });
        await expectReachable(remove);
        await remove.click();
        const editArt = drawer.getByRole("button", { name: "Gaiomon · Choose artwork", exact: true });
        await expectReachable(editArt);
        await editArt.click();
        const picker = page.getByRole("dialog", { name: "Choose artwork", exact: true });
        await expectReachable(picker.getByRole("button", { name: "Alternate 1", exact: true }));
        await picker.getByRole("button", { name: "Alternate 1", exact: true }).click();
        await picker.getByRole("button", { name: "Done", exact: true }).click();
        await expectNoFloatingPreview(page);
        const close = drawer.getByRole("button", { name: "Close", exact: true });
        await expectReachable(close);
        await close.click();
        await expect(drawer).toHaveCount(0);
        await expectNoFloatingPreview(page);
      });
    }
  });
}

test("1557582869973696582: desktop pool hover still previews cards", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
  await page.goto("/e2e/deck-builder.html");
  await searchGaiomon(page);
  await page.getByRole("img", { name: "Gaiomon", exact: true }).hover();
  await expect(page.getByRole("img", { name: "Gaiomon", exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Card info", exact: true }).click();
  await expectNoFloatingPreview(page);
});
