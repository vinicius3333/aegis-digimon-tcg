import { test, expect } from "./scenario-page";

test("GitHub #5387: Crescemon does not discount Hexeblaumon; evolution animations finish", async ({ scenario }) => {
  await scenario.open("arena-crescemon-hexeblaumon-cost");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const base = before.players[0]!.battleArea[0]!;
  const hex = before.players[0]!.hand.find((c) => c.cardId === "EX7-023")!;
  expect(hex.digivolveRoutes.filter((r) => r.permanentId === base.permanentId).map((r) => r.projectedCost)).toEqual([
    4,
  ]);
  await scenario.evolve("Hexeblaumon", base.permanentId);
  await scenario.resolveUntil((s) => s.players[0]!.battleArea[0]?.topCard.cardId === "EX7-023" && !s.pendingDecision);
  expect((await scenario.snapshot()).memory).toBe(2);
  await scenario.healthy();
});
