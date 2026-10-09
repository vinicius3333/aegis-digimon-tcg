import { test, expect } from "./scenario-page";

test("GitHub #5381: Pistmon's On Play completes inside Climbmon's evolution", async ({ scenario }) => {
  await scenario.open("arena-climbmon-pistmon-play");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const base = (await scenario.snapshot()).players[0]!.battleArea[0]!;
  await scenario.evolve("Climbmon", base.permanentId);
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-044") && !s.pendingDecision,
    (d) =>
      d.kind === "selectCards"
        ? { cardId: d.options.candidateInstanceIds?.includes("report-pistmon") ? "BT16-044" : "BT1-009" }
        : {},
  );
  const final = await scenario.snapshot();
  expect(final.memory).toBe(7);
  expect(final.players[0]!.securityCount).toBe(3);
  expect(final.players[1]!.battleArea[0]!.isSuspended).toBe(true);
  expect(final.players[0]!.deckCount).toBe(16);
  expect(final.players[0]!.trash.some((c) => c.instanceId === "report-pistmon")).toBe(false);
  expect(
    (await scenario.presentation()).events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT16-044"),
  ).toBe(true);
  await scenario.healthy();
});
