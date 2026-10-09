import { expect, test } from "./scenario-page";

async function fitsViewport(page: import("@playwright/test").Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

// The same product artwork is used before, during, and after a phase transition.
test("#5394 native artwork drag cannot steal the hand gesture between phases", async ({ scenario, page }) => {
  await scenario.open("arena-github-5417-mobile-assembly", "normal", "none");
  const hand = page.getByTestId("hand");
  const art = hand.getByRole("img", { name: "UlforceVeedramon", exact: true });
  await expect(art).toBeVisible();
  expect(await art.evaluate((element) => (element as HTMLImageElement).draggable)).toBe(false);
  await page.evaluate(() => {
    document.addEventListener("dragstart", () => {
      document.documentElement.dataset.nativeImageDrag = "true";
    });
  });
  const before = await scenario.snapshot();
  const box = (await art.boundingBox())!;
  await page.mouse.move(box.x + 5, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y - 40, { steps: 10 });
  await page.mouse.up();
  expect(await page.evaluate(() => document.documentElement.dataset.nativeImageDrag)).toBeUndefined();
  expect((await scenario.snapshot()).players[0]!.hand.map((card) => card.instanceId)).toEqual(
    before.players[0]!.hand.map((card) => card.instanceId),
  );
  await page.getByRole("button", { name: /^end breeding$/i }).click();
  await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  await scenario.play("UlforceVeedramon", "Digimon");
  await expect(page.getByRole("dialog", { name: /Assembly/ })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await scenario.healthy();
});

for (const width of [320, 1280]) {
  for (const theme of ["dark", "light"] as const) {
    test(`#5417 Assembly preserves viewport width ${width} ${theme}`, async ({ scenario, page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript((dark) => localStorage.setItem("aegis:darkMode", String(dark)), theme === "dark");
      await scenario.open("arena-github-5417-mobile-assembly");
      await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
      await scenario.idle();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
        .toBe(theme === "dark");
      await fitsViewport(page);
      await scenario.play("UlforceVeedramon", "Digimon");
      const dialog = page.getByRole("dialog", { name: /Assembly/ });
      await expect(dialog).toBeVisible();
      await fitsViewport(page);
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      for (const name of ["Veemon", "Veedramon", "AeroVeedramon"])
        await dialog.getByRole("button", { name: `${name} (trash)`, exact: true }).click();
      await dialog.getByRole("button", { name: /Assembly \(3/ }).click();
      await scenario.resolveUntil(
        (state) => state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-023") && !state.pendingDecision,
        () => ({ accept: false }),
      );
      const state = await scenario.snapshot();
      expect(
        state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-023")!.stack.map((c) => c.cardId),
      ).toEqual(["EX13-017", "EX13-019", "EX13-022"]);
      expect(state.memory).toBe(3);
      await fitsViewport(page);
      await scenario.healthy();
    });
  }
}

test("#5410 deleting Rie does not activate a card's inherited deletion effect", async ({ scenario }) => {
  await scenario.open("arena-github-5410-tamer-inherited-deletion");
  const before = await scenario.snapshot();
  const kotemon = before.players[0]!.trash.find((card) => card.cardId === "BT18-058")!.instanceId;
  await scenario.play("All Delete", "Option");
  await scenario.resolveUntil((state) => state.players[0]!.battleArea.length === 0 && !state.pendingDecision);
  const state = await scenario.snapshot();
  expect(state.players[0]!.trash.map((card) => card.instanceId)).toContain(kotemon);
  expect(
    (await scenario.presentation()).events.filter(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT19-063",
    ),
  ).toEqual([]);
  await scenario.healthy();
});

test("#5412 Kapurimon refuses the reported MetalGarurumon DNA color pair", async ({ scenario }) => {
  await scenario.open("arena-github-5412-kapurimon-illegal-colors");
  await expect(scenario.page.getByRole("button", { name: "No Selection", exact: true })).toBeVisible();
  await scenario.resolveUntil(
    (state) => state.phase === "Main" && !state.pendingDecision,
    () => ({ accept: false }),
  );
  const before = await scenario.snapshot();
  const attacker = before.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX12-016")!;
  // A player can attack a suspended Digimon through its actual field menu.
  await scenario.idle();
  await scenario.page.locator(`[data-drop="perm-you"][data-id="${attacker.permanentId}"]`).click();
  await scenario.page.getByRole("button", { name: "Attack", exact: true }).click();
  await scenario.page.locator('[data-drop="perm-opp"]').click();
  await scenario.resolveUntil(
    (state) =>
      state.players[0]!.trash.some((c) => c.instanceId === attacker.topCard.instanceId) &&
      !state.pendingDecision &&
      !state.combatWindow,
    () => ({ accept: false }),
  );
  const state = await scenario.snapshot();
  expect(state.players[0]!.hand.some((card) => card.cardId === "EX12-035")).toBe(true);
  expect(state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX9-018", "EX12-008"]);
  await scenario.healthy();
});

test("#5416 Ulforce's own unsuspend preserves its player attack", async ({ scenario }) => {
  await scenario.open("arena-github-5416-ulforce-unsuspend");
  const before = await scenario.snapshot();
  await scenario.attack(before.players[0]!.battleArea[0]!.permanentId);
  await scenario.resolveUntil(
    (state) =>
      state.players[1]!.securityCount === before.players[1]!.securityCount - 1 &&
      !state.pendingDecision &&
      !state.combatWindow,
    (decision) => ({
      choice:
        decision.kind === "chooseOption"
          ? decision.options.choices?.findIndex((choice) => /^Unsuspend/.test(choice))
          : undefined,
      accept: true,
    }),
  );
  const state = await scenario.snapshot();
  expect(state.players[0]!.battleArea[0]!.isSuspended).toBe(false);
  await scenario.healthy();
});

// The report omits the exact Lucemon card. This locks the reported 0–4
// selection shape with Fanglongmon, whose printed trash cost supplies that range.
for (const count of [0, 1, 4]) {
  test(`#5374 representative up-to-four trash selection accepts ${count}`, async ({ scenario }) => {
    await scenario.open("arena-github-5374-up-to-four-trash");
    const before = await scenario.snapshot();
    const returned = before.players[0]!.trash.slice(0, count).map((card) => card.instanceId);
    await scenario.attack(before.players[0]!.battleArea[0]!.permanentId);
    await scenario.resolveUntil(
      (state) =>
        state.players[1]!.securityCount < before.players[1]!.securityCount &&
        !state.pendingDecision &&
        !state.combatWindow,
      (decision) => ({
        accept: count !== 0,
        instanceIds: decision.kind === "selectCards" ? returned : undefined,
      }),
    );
    const state = await scenario.snapshot();
    expect(state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      before.players[0]!.trash.slice(count).map((card) => card.instanceId),
    );
    expect(state.players[0]!.deckCount).toBe(before.players[0]!.deckCount + count);
    const returnedPublicly = (await scenario.presentation()).events.flatMap((event) =>
      event.kind === "cardsMoved" && event.to === "deckBottom" && event.seat === 0 ? event.instanceIds : [],
    );
    expect(returnedPublicly).toEqual(returned);
    await scenario.healthy();
  });
}
