import { test, expect } from "./scenario-page";

test("GitHub #5388: Heat Training search and placement finish and unlock the next card", async ({ scenario }) => {
  await scenario.open("arena-heat-training-option-freeze");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  await scenario.play("Heat Training", "Option");
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "LM-059") && !s.pendingDecision,
    () => ({ instanceId: "new-report-red" }),
  );
  const state = await scenario.snapshot();
  expect(state.memory).toBe(4);
  expect(state.players[0]!.hand.some((c) => c.instanceId === "new-report-red")).toBe(true);
  await scenario.healthy();
  const reserve = scenario.page
    .getByTestId("hand")
    .getByRole("button", { name: /^Select Monodramon(?:,|$)/ })
    .first();
  // Two Monodramon copies are equivalent; play the selected rendered copy through normal controls.
  await reserve.focus();
  await reserve.press("Enter");
  await scenario.page.getByRole("button", { name: "Play Digimon", exact: true }).click();
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-009") && !s.pendingDecision,
  );
  expect((await scenario.snapshot()).memory).toBe(2);
  await scenario.healthy();
});
