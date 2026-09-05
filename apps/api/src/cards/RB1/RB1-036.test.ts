import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-036 Proximamon", () => {
  it("rejects the alternate cost when Siriusmon lacks an Arcturusmon digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-001", as: "siriusmon" }], hand: [{ card: "RB1-036", as: "proximamon" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("siriusmon").permanentId,
        instanceId: s.inst("proximamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses the exact alternate cost 3 when Siriusmon has an Arcturusmon source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "LM-001", as: "siriusmon", under: ["RB1-031"] }],
        hand: [{ card: "RB1-036", as: "proximamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("siriusmon").permanentId,
        instanceId: s.inst("proximamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("siriusmon").topCard?.cardId === "RB1-036");
    expect(s.perm("siriusmon").topCard?.cardId).toBe("RB1-036");
    expect(s.state.memory).toBe(0);
  });

  it("places the exact Gammamon-text card and deletes an opposing Digimon within its DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-036", as: "proximamon" }], hand: [{ card: "RB1-005", as: "gammamon" }] },
        1: { battleArea: [{ card: "RB1-005", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const gammamonInstanceId = s.inst("gammamon").instanceId;

    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => s.perm("proximamon").stack.some((card) => card.instanceId === gammamonInstanceId));

    expect(s.perm("proximamon").stack.some((card) => card.instanceId === gammamonInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === gammamonInstanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
