import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/mother-d-reaper-digimon-cost.fixture";
import "#api/cards/EX2/EX2-007";
import "#api/cards/EX2/EX2-046";
import "#api/cards/EX2/EX2-047";
import "#api/cards/P/P-158";

it("keeps Mother D-Reaper's reduction for a Digimon after declining it for Jeri", async () => {
  const s = setupScenario(fixture, { autoSelectCards: true });
  const loop = s.engine.startTurnLoop();
  const answerMotherReduction = async (accept: boolean) => {
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("EX2-007");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
  };
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await answerMotherReduction(false);
    expect(s.state.memory).toBe(4);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digimon").instanceId })).toEqual({
      ok: true,
    });
    await answerMotherReduction(true);
    expect(s.state.memory).toBe(3);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
