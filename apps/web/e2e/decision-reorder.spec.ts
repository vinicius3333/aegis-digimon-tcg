import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ hasTouch: true });

async function open(page: Page, scenario: string, width = 1440) {
  await page.setViewportSize({ width, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
  await page.goto(`/dev/effect-prompts?case=${scenario}`);
  const list = page.getByRole("list", {
    name: scenario === "order-cards" ? "Choose the card order" : "Order pending effects",
    exact: true,
  });
  await expect(list).toBeVisible();
  return list;
}

async function drag(page: Page, source: Locator, target: Locator, touch = false) {
  const start = (await source.getByRole("button", { name: /^Reorder item/ }).boundingBox())!;
  const end = (await target.boundingBox())!;
  const from = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
  const to = { x: end.x + end.width / 2, y: end.y + end.height / 2 };
  if (touch) {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
      await expect(page.locator(".decision-reorder-preview")).toBeVisible();
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [to] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } finally {
      await session.detach();
    }
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await expect(page.locator(".decision-reorder-preview")).toBeVisible();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
  }
  await expect(page.locator(".decision-reorder-preview")).toHaveCount(0);
}

async function ids(list: Locator) {
  return list.getByRole("listitem").evaluateAll((rows) => rows.map((row) => (row as HTMLElement).dataset.reorderId));
}

for (const touch of [false, true]) {
  test(`cards reorder in one column with ${touch ? "touch" : "mouse"}, preserve the edit and submit instance identities`, async ({
    page,
  }) => {
    const list = await open(page, "order-cards", touch ? 390 : 1440);
    const rows = list.getByRole("listitem");
    await expect(rows).toHaveCount(4);
    const boxes = await rows.evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, bottom: box.bottom };
      }),
    );
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index]!.x).toBeCloseTo(boxes[0]!.x, 0);
      expect(boxes[index]!.y).toBeGreaterThanOrEqual(boxes[index - 1]!.bottom);
    }
    const expected = touch ? ["hand-1", "hand-0", "hand-2", "hand-3"] : ["hand-1", "hand-2", "hand-3", "hand-0"];
    await drag(page, rows.nth(0), rows.nth(touch ? 1 : 3), touch);
    await expect.poll(() => ids(list)).toEqual(expected);
    await page.getByRole("button", { name: "View board", exact: true }).click();
    await page.getByRole("button", { name: "Return to decision", exact: true }).click();
    await expect.poll(() => ids(list)).toEqual(expected);
    await page.getByRole("button", { name: "Confirm order", exact: true }).click();
    await expect(page.locator(".effect-prompt-gallery__response")).toContainText('"hand-1"');
    const response = JSON.parse((await page.locator(".effect-prompt-gallery__response pre").textContent())!);
    expect(response).toEqual({ kind: "orderCards", order: expected });
  });

  test(`pending effects reorder with ${touch ? "touch" : "mouse"} without changing optional presets or older effects`, async ({
    page,
  }) => {
    const list = await open(page, "resolution-plan", touch ? 390 : 1440);
    const initial = await ids(list);
    const preset = page.getByRole("group", { name: /Greymon/ });
    await preset.getByRole("button", { name: "No", exact: true }).click();
    await drag(page, list.getByRole("listitem").nth(1), list.getByRole("listitem").nth(0), touch);
    await expect.poll(() => ids(list)).toEqual([initial[1], initial[0]]);
    await expect(preset.getByRole("button", { name: "No", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^Reorder item/ })).toHaveCount(2);
    await page.getByRole("button", { name: "Resolve in this order", exact: true }).click();
    const response = JSON.parse((await page.locator(".effect-prompt-gallery__response pre").textContent())!);
    expect(response).toEqual({
      kind: "orderTriggers",
      order: [initial[1], initial[0]],
      optionalAnswers: { [initial[0]!]: false },
    });
  });
}

test("outside drops and Escape cancel, while keyboard arrows reorder cards", async ({ page }) => {
  const list = await open(page, "order-cards");
  const handle = list.getByRole("button", { name: "Reorder item 1", exact: true });
  const bounds = (await handle.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(20, 20);
  const lifted = page.locator(".decision-reorder-preview");
  await expect(lifted).toBeVisible();
  expect(await lifted.evaluate((node) => node.parentElement === document.body)).toBe(true);
  const liftedBounds = (await lifted.boundingBox())!;
  const panelBounds = (await page.getByRole("dialog").boundingBox())!;
  expect(liftedBounds.x).toBeLessThan(panelBounds.x);
  expect(liftedBounds.y).toBeLessThan(panelBounds.y);
  expect(await lifted.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("none");
  await page.mouse.up();
  await expect(lifted).toHaveCount(0);
  expect(await ids(list)).toEqual(["hand-0", "hand-1", "hand-2", "hand-3"]);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(lifted).toHaveCount(0);
  expect(await ids(list)).toEqual(["hand-0", "hand-1", "hand-2", "hand-3"]);
  await handle.focus();
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => ids(list)).toEqual(["hand-1", "hand-0", "hand-2", "hand-3"]);
});

test("keyboard arrows reorder pending effects and respect the first and last slots", async ({ page }) => {
  const list = await open(page, "resolution-plan", 390);
  const initial = await ids(list);
  const handle = list.getByRole("button", { name: "Reorder item 1", exact: true });
  await handle.focus();
  await page.keyboard.press("ArrowUp");
  expect(await ids(list)).toEqual(initial);
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => ids(list)).toEqual([initial[1], initial[0]]);
  await page.keyboard.press("ArrowDown");
  expect(await ids(list)).toEqual([initial[1], initial[0]]);
  await page.getByRole("button", { name: "Resolve in this order", exact: true }).click();
  const response = JSON.parse((await page.locator(".effect-prompt-gallery__response pre").textContent())!);
  expect(response).toEqual({ kind: "orderTriggers", order: [initial[1], initial[0]] });
});
