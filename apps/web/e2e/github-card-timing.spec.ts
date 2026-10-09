import { test, expect } from "./scenario-page";

test("#5398: Rie deletes its payment and evolves at end of turn", async ({ scenario }) => {
  await scenario.open("arena-bt22-rie-kishibe-legal-digivolve");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX13-064") && !s.pendingDecision,
    (d) => ({ accept: !/Attack/.test(d.promptText), cardId: "EX13-064" }),
  );
  const s = await scenario.snapshot();
  expect(s.players[0]!.trash.some((c) => c.cardId === "BT22-083")).toBe(true);
  await scenario.healthy();
});

test("#5399: the discarded Dark Field is available immediately to Cerberusmon", async ({ scenario }) => {
  await scenario.open("arena-github5399-cerberus-first-option");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const base = (await scenario.snapshot()).players[0]!.battleArea[0]!;
  await scenario.evolve("Cerberusmon", base.permanentId, true);
  await scenario.resolveUntil(
    (s) => s.players[0]!.security.at(-1)?.cardId === "BT26-100" && !s.pendingDecision,
    (d) => ({ cardId: "BT26-100", accept: d.sourceCardId !== "BT26-100" }),
  );
  expect((await scenario.snapshot()).memory).toBe(6);
  await scenario.healthy();
});

test("#5400: Dark Field replacement preserves both exact copies", async ({ scenario }) => {
  await scenario.open("arena-github5400-dark-field-replacement");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const old = before.players[0]!.security[0]!.instanceId;
  const next = before.players[0]!.hand.find((c) => c.cardId === "BT26-100")!.instanceId;
  await scenario.play("Dark Field", "Option");
  await scenario.resolveUntil(
    (s) => s.players[0]!.security[0]?.instanceId === next && !s.pendingDecision,
    () => ({ accept: false }),
  );
  expect((await scenario.snapshot()).players[0]!.hand.some((c) => c.instanceId === old)).toBe(true);
  await scenario.healthy();
});

for (const cost of ["BT22-090", "BT18-099"]) {
  test(`#5403: Rie places Knightmon-text ${cost} under itself`, async ({ scenario }) => {
    await scenario.open("arena-github5403-rie-any-card");
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    await scenario.play("Knightmon", "Digimon");
    await scenario.resolveUntil(
      (s) =>
        s.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-074")?.stack.some((c) => c.cardId === cost) ===
          true && !s.pendingDecision,
      () => ({ cardId: cost }),
    );
    expect((await scenario.snapshot()).players[0]!.trash.some((c) => c.cardId === "BT1-009")).toBe(true);
    await scenario.healthy();
  });
}

test("#5409: Ouryuken resolves its printed DNA evolution effects", async ({ scenario }) => {
  await scenario.open("arena-github-5323-alphamon-main-dna");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  await scenario.hand("Alphamon: Ouryuken");
  await scenario.page.getByRole("button", { name: "Digivolve", exact: true }).click();
  for (const p of before.players[0]!.battleArea)
    await scenario.page.locator(`[data-drop="perm-you"][data-id="${p.permanentId}"]`).click();
  await scenario.page
    .getByRole("region", { name: /DNA Digivolution available/i })
    .getByRole("button", { name: /^DNA Digivolve$/i })
    .click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-060") && !s.pendingDecision,
  );
  const after = await scenario.snapshot();
  expect(after.players[0]!.securityCount).toBe(before.players[0]!.securityCount + 1);
  expect(after.players[1]!.securityCount).toBe(before.players[1]!.securityCount - 1);
  await scenario.healthy();
});

test("#5411: SaviorHuckmon permits declining the private selection after payment", async ({ scenario }) => {
  await scenario.open("arena-github5411-savior-empty-hand-selection");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.page.getByRole("button", { name: /^End turn$/i }).click();
  await scenario.resolveUntil(
    (s) => s.turnSeat === 1 && !s.pendingDecision,
    (d) => ({ accept: d.kind !== "selectCards" }),
  );
  const s = await scenario.snapshot();
  expect(s.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-009")?.isSuspended).toBe(true);
  expect(s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-014")).toBe(true);
  expect(s.players[0]!.hand.some((c) => c.cardId === "BT6-016")).toBe(true);
  await scenario.healthy();
});

test("#5418: ZeigGreymon offers the Blue Flare Shoutmon X7 cost-2 route", async ({ scenario }) => {
  await scenario.open("arena-github5418-zeig-shoutmon-evolution");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const base = before.players[0]!.battleArea[0]!;
  const x7 = before.players[0]!.hand.find((card) => card.cardId === "AD1-006")!;
  expect([
    ...new Set(
      x7.digivolveRoutes.filter((route) => route.permanentId === base.permanentId).map((route) => route.projectedCost),
    ),
  ]).toEqual([2]);
  await scenario.evolve("Shoutmon X7", base.permanentId);
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea[0]?.topCard.cardId === "AD1-006" && !s.pendingDecision,
    () => ({ accept: false }),
  );
  const after = await scenario.snapshot();
  const evolved = after.players[0]!.battleArea[0]!;
  expect(evolved.topCard.instanceId).toBe(x7.instanceId);
  expect(evolved.stack.map((card) => card.instanceId)).toEqual([
    ...base.stack.map((card) => card.instanceId),
    base.topCard.instanceId,
  ]);
  expect(after.players[0]!.hand.some((card) => card.instanceId === x7.instanceId)).toBe(false);
  expect(after.memory).toBe(8);
  await scenario.healthy();
});
