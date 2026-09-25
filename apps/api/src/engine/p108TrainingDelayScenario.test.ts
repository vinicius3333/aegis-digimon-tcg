import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/P/P-108.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

async function activateTrainingDelay(scenario: DevScenarioId) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario(scenario, s.state, [BLUE_DECK, RED_DECK]);
  await s.ready();
  const human = s.state.players[0]!;
  const training = human.battleArea.find(({ topCard }) => topCard.cardId === "P-108")!;
  const trainingId = training.topCard.instanceId;

  const turn = s.engine.runOneTurn();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  s.state.memory = 3;

  const [ability] = JSON.parse(training.activatableEffectsJson || "[]") as { effectKey: string }[];
  expect(ability).toBeDefined();
  expect(
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: trainingId, effectKey: ability!.effectKey }),
  ).toEqual({ ok: true });
  await settle(
    () => human.trash.some(({ instanceId }) => instanceId === trainingId) && s.state.pendingDecision === undefined,
  );
  return { s, human, turn };
}

describe("P-108 Wisdom Training ＜Delay＞ arena scenario", () => {
  it("trashes the Option with no Digimon on the field and digivolves nothing (CR 15-7-5)", async () => {
    const { s, human, turn } = await activateTrainingDelay("arena-p108-training-delay-no-target");

    expect(human.battleArea).toHaveLength(0);
    expect(human.trash.map(({ cardId }) => cardId)).toEqual(["P-108"]);
    expect(human.hand.map(({ cardId }) => cardId)).toContain("BT2-073");
    expect(s.state.memory).toBe(3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("digivolves the host for the reduced cost when a legal target exists", async () => {
    const { s, human, turn } = await activateTrainingDelay("arena-p108-training-delay-with-target");

    expect(human.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT2-073"]);
    expect(human.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(["BT2-068"]);
    expect(human.trash.map(({ cardId }) => cardId)).toEqual(["P-108"]);
    expect(s.state.memory).toBe(3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
