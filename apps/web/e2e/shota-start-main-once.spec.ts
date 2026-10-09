import { test, expect } from "./scenario-page";

test("GitHub #5389: two Shota resolve once each at Main entry, with no repeat activation", async ({ scenario }) => {
  await scenario.open("arena-shota-start-main-once");
  await scenario.resolveUntil(
    (s) => s.phase === "Main" && !s.pendingDecision,
    () => ({ cardId: "BT25-093" }),
  );
  const state = await scenario.snapshot();
  expect(state.memory).toBe(8);
  expect(state.players[0]!.trash.filter((c) => c.cardId === "BT25-093")).toHaveLength(2);
  for (const p of state.players[0]!.battleArea) expect(JSON.parse(p.activatableEffectsJson || "[]")).toEqual([]);
  expect(
    (await scenario.presentation()).events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-092"),
  ).toHaveLength(2);
  await scenario.healthy();
  // A visible normal action must still work without replaying the start-of-Main effects.
  // Three identical drawn/reserve copies are interchangeable; use the first rendered copy.
  const reserve = scenario.page
    .getByTestId("hand")
    .getByRole("button", { name: /^Select Monodramon(?:,|$)/ })
    .first();
  await reserve.focus();
  await reserve.press("Enter");
  await scenario.page.getByRole("button", { name: "Play Digimon", exact: true }).click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-009") && !s.pendingDecision,
  );
  expect((await scenario.snapshot()).memory).toBe(6);
  expect(
    (await scenario.presentation()).events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "BT26-092"),
  ).toHaveLength(2);
  await scenario.healthy();
});
