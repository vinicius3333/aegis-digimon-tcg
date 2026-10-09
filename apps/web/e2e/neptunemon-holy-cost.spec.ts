import { test, expect } from "./scenario-page";

test("GitHub #5385: Holy uses Neptunemon's three-memory TS evolution route", async ({ scenario }) => {
  await scenario.open("arena-neptunemon-holy-cost");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const before = await scenario.snapshot();
  const base = before.players[0]!.battleArea[0]!;
  const neptune = before.players[0]!.hand.find((c) => c.cardId === "BT24-030")!;
  expect(neptune.digivolveRoutes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ permanentId: base.permanentId, alternateRequirementIndex: 2, projectedCost: 3 }),
    ]),
  );
  await scenario.evolve("Neptunemon", base.permanentId, true);
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.battleArea[0]?.topCard.cardId === "BT24-030" &&
      s.players[1]!.battleArea.length === 0 &&
      !s.pendingDecision,
  );
  const final = await scenario.snapshot();
  expect(final.memory).toBe(3);
  expect(final.players[0]!.battleArea[0]!.stack.map((c) => c.cardId)).toEqual(["BT26-029"]);
  expect((await scenario.presentation()).events.some((e) => e.kind === "actionRejected")).toBe(false);
  await scenario.healthy();
});
