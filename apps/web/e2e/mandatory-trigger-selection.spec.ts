import { expect, test, type Locator } from "@playwright/test";

// Server-free test: the coordinator supplies its existing web/API harness.
// Gallery uses the production chooser and CSS; live card transactions remain
// separately accepted in the coordinator-owned King Drasil and Royal Knights routes.
async function expectBulkHitTarget(button: Locator) {
  await button.scrollIntoViewIfNeeded();
  const probe = await button.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    return {
      rect: bounds.toJSON(),
      ownsHit: hit !== null && element.contains(hit),
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      media: { coarse: matchMedia("(pointer: coarse)").matches, hover: matchMedia("(hover: hover)").matches },
    };
  });
  expect(probe.rect.height, JSON.stringify(probe)).toBeGreaterThanOrEqual(44);
  expect(probe.rect.left).toBeGreaterThanOrEqual(0);
  expect(probe.rect.right).toBeLessThanOrEqual(probe.viewport.width);
  expect(probe.rect.top).toBeGreaterThanOrEqual(0);
  expect(probe.rect.bottom).toBeLessThanOrEqual(probe.viewport.height);
  expect(probe.ownsHit, JSON.stringify(probe)).toBe(true);
  expect(probe.media.coarse, JSON.stringify(probe)).toBe(true);
  expect(probe.media.hover, JSON.stringify(probe)).toBe(false);
  return probe;
}

for (const locale of ["en", "pt-BR"] as const) {
  test.describe(locale, () => {
    test.use({ hasTouch: true });
    const labels =
      locale === "en"
        ? {
            list: "Order pending effects",
            all: "Select all, top to bottom",
            mandatory: "Select mandatory, top to bottom",
            no: "No",
            resolve: "Resolve in this order",
          }
        : {
            list: "Ordenar efeitos pendentes",
            all: "Selecionar todos, de cima para baixo",
            mandatory: "Selecionar obrigatórios, de cima para baixo",
            no: "Não",
            resolve: "Resolver nesta ordem",
          };
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 673, height: 841 },
      { width: 902, height: 550 },
      { width: 768, height: 1024 },
      { width: 1440, height: 1000 },
    ]) {
      test(`Discord 1557582469409144852 bulk targets and explicit consent at ${viewport.width}x${viewport.height}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.addInitScript((value) => localStorage.setItem("aegis:locale", value), locale);
        await page.goto("/dev/effect-prompts?case=resolution-plan&controls=0");
        const list = page.getByRole("list", { name: labels.list, exact: true });
        await expect(list).toBeVisible();
        const rows = list.getByRole("listitem");
        await expect(rows).toHaveCount(2);
        const keys = await rows.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-reorder-id")),
        );
        const presets = page.locator(".trigger-chooser__preset");
        await expect(presets).toHaveCount(1);
        await presets.getByRole("button", { name: labels.no, exact: true }).tap();
        const all = page.getByRole("button", { name: labels.all, exact: true });
        const mandatory = page.getByRole("button", { name: labels.mandatory, exact: true });
        await testInfo.attach("bulk-geometry", {
          body: JSON.stringify(
            { all: await expectBulkHitTarget(all), mandatory: await expectBulkHitTarget(mandatory) },
            null,
            2,
          ),
          contentType: "application/json",
        });
        await mandatory.tap();
        await expect(rows.locator(".trigger-chooser__option[aria-pressed=true]")).toHaveCount(1);
        await expect(rows.nth(0)).toHaveAttribute("data-reorder-id", keys[1]!);
        await expect(presets.getByRole("button", { name: labels.no, exact: true })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(page.locator(".effect-prompt-gallery__response")).toHaveCount(0);
        // Keyboard activation appends the optional row after the manually retained
        // mandatory selection, without changing No or sending a response.
        const rest = page.getByRole("button", {
          name: locale === "en" ? "Add the rest in shown order" : "Adicionar o resto na ordem exibida",
          exact: true,
        });
        await expectBulkHitTarget(rest);
        await rest.focus();
        await rest.press("Enter");
        await expect(rows.locator(".trigger-chooser__option[aria-pressed=true]")).toHaveCount(2);
        await expect(page.locator(".effect-prompt-gallery__response")).toHaveCount(0);
        await page.getByRole("button", { name: labels.resolve, exact: true }).click();
        const response = page.locator(".effect-prompt-gallery__response pre");
        await expect(response).toBeVisible();
        expect(JSON.parse((await response.textContent())!)).toEqual({
          kind: "orderTriggers",
          order: [keys[1], keys[0]],
          optionalAnswers: { [keys[0]!]: false },
        });
      });
    }
  });
}
