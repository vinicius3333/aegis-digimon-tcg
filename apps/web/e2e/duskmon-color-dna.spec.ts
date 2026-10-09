import { test, expect } from "./scenario-page";
import { GamePage } from "./game-page";

// The bot plays its scenario turn (turn 2); hold its next turn after the human's turn 3.
test.use({ holdBotAfterTurn: 3 });

const MATERIAL = "dev-perm-0-duskmon-changed";
const GREEN = "dev-perm-0-duskmon-green";

test("Discord 1557565628439724032: Duskmon's color change survives evolution and blocks Examon's blue DNA", async ({
  scenario,
  page,
}) => {
  test.setTimeout(150_000);
  await scenario.open("arena-discord-1557565628439724032-duskmon-dna-colors", "normal", "none");
  // The bot plays Duskmon on its turn and changes Wingdramon to red.
  await expect(page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled({ timeout: 60_000 });
  await page.getByRole("button", { name: /^end breeding$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  const initial = await scenario.snapshot();
  expect(initial.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT18-078"]);
  const wingdramon = initial.players[0]!.battleArea.find((p) => p.permanentId === MATERIAL)!;
  expect(wingdramon.topCard.cardId).toBe("EX13-021");
  expect(wingdramon.originalColorsOverride).toEqual(["Red"]);
  const examon = initial.players[0]!.hand.find((c) => c.cardId === "BT13-059")!;
  expect(examon.dnaDigivolveRoutes).toHaveLength(0);
  await scenario.hand("Examon");
  await expect(page.getByRole("button", { name: "DNA Digivolve", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();

  // Red Wingdramon has no blue/green Lv.5 route, so only the named [Wingdramon] cost of 3 applies.
  await scenario.evolve("Slayerdramon", MATERIAL);
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea.find((p) => p.permanentId === MATERIAL)!.topCard.cardId === "EX3-024" &&
      !s.pendingDecision,
  );
  const evolved = await scenario.snapshot();
  const slayerdramon = evolved.players[0]!.battleArea.find((p) => p.permanentId === MATERIAL)!;
  expect(slayerdramon.stack.map((c) => c.cardId)).toEqual(["EX13-008", "EX13-021"]);
  expect(slayerdramon.originalColorsOverride).toEqual(["Red"]);
  expect(evolved.memory).toBe(initial.memory - 3);
  expect(evolved.players[0]!.hand.find((c) => c.cardId === "BT13-059")!.dnaDigivolveRoutes).toHaveLength(0);
  await scenario.hand("Examon");
  await expect(page.getByRole("button", { name: "DNA Digivolve", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: /^end turn$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 1 && !s.pendingDecision);
  const final = await scenario.snapshot();
  const probe = await scenario.presentation();
  // Inherited Dracomon must not offer an illegal DNA at the end of the turn.
  expect(probe.decisions.filter((d) => d.sourceCardId === "EX13-008")).toEqual([]);
  expect(probe.events.filter((e) => e.kind === "digivolved" && e.cardId === "BT13-059")).toEqual([]);
  expect(final.players[0]!.hand.map((c) => c.instanceId)).toContain(examon.instanceId);
  expect(final.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([MATERIAL, GREEN]);
  // "Until the end of your opponent's turn" ends with this turn.
  expect(final.players[0]!.battleArea.find((p) => p.permanentId === MATERIAL)!.originalColorsOverride ?? []).toEqual(
    [],
  );
  await scenario.healthy();
});

test("Discord 1557565628439724032 control: without Duskmon, Wingdramon + HerculesKabuterimon DNA into Examon for 0", async ({
  scenario,
  page,
}) => {
  test.setTimeout(120_000);
  await scenario.open("arena-discord-1557565628439724032-duskmon-dna-control", "normal", "none");
  await expect(page.getByRole("button", { name: /^end breeding$/i })).toBeEnabled({ timeout: 60_000 });
  await page.getByRole("button", { name: /^end breeding$/i }).click();
  await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
  const initial = await scenario.snapshot();
  expect(initial.players[1]!.battleArea).toHaveLength(0);
  expect(initial.players[0]!.battleArea.find((p) => p.permanentId === MATERIAL)!.originalColorsOverride ?? []).toEqual(
    [],
  );
  const examon = initial.players[0]!.hand.find((c) => c.cardId === "BT13-059")!;
  expect(examon.dnaDigivolveRoutes).toHaveLength(1);

  await expect(page.getByRole("button", { name: /^end turn$/i })).toBeEnabled();
  await new GamePage(page).dragCardTo(/^Examon$/i, page.locator('[data-drop="battle-you"]'));
  const dna = page.getByRole("region", { name: /DNA Digivolution available/i });
  await expect(dna).toBeVisible();
  for (const permanentId of [MATERIAL, GREEN]) {
    const card = page.locator(`[data-id="${permanentId}"][role="button"]`);
    if (!(await card.locator(".game-permanent__material-order").count())) {
      await card.focus();
      await card.press("Enter");
    }
    await expect(card.locator(".game-permanent__material-order")).toBeVisible();
  }
  await dna.getByRole("button", { name: "DNA Digivolve", exact: true }).click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-059") && !s.pendingDecision,
    () => ({ accept: false }),
  );
  const final = await scenario.snapshot();
  expect(final.players[0]!.battleArea).toHaveLength(1);
  const result = final.players[0]!.battleArea[0]!;
  expect(result.topCard.instanceId).toBe(examon.instanceId);
  expect(result.stack.map((c) => c.cardId)).toEqual(["EX13-008", "EX13-021", "BT1-081"]);
  expect(result.isSuspended).toBe(false);
  expect(final.players[0]!.hand.map((c) => c.instanceId)).not.toContain(examon.instanceId);
  expect(final.memory).toBe(initial.memory);
  await scenario.healthy();
});
