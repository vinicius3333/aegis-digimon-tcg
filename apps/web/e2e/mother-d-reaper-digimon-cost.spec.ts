import fixture from "../../api/src/engine/scenarios/mother-d-reaper-digimon-cost.fixture";
import { test, expect } from "./scenario-page";

test("Mother D-Reaper reduces a Digimon after its reduction is declined for Jeri", async ({ scenario }) => {
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && !state.pendingDecision);
  await scenario.play("Jeri (Fake)", "Tamer");
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === refs.instanceId("tamer")),
    (decision) => (decision.kind === "optional" ? { accept: false } : {}),
  );
  expect((await scenario.snapshot()).memory).toBe(4);
  await scenario.play("ADR-03 Pendulum Feet", "Digimon");
  await scenario.resolveUntil(
    (state) =>
      !state.pendingDecision &&
      state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === refs.instanceId("digimon")),
  );
  expect((await scenario.snapshot()).memory).toBe(3);
  await scenario.healthy();
});
