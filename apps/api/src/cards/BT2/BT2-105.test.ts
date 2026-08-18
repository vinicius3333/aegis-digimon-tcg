import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-105.js";

describe("BT2-105 Spider Shooter", () => {
  it("de-digivolves exactly one selected opposing Digimon by one card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-052", as: "own" }], hand: [{ card: "BT2-105", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT2-045", as: "first", under: ["BT2-043"] },
          { card: "BT2-046", as: "second", under: ["BT2-044"] },
        ],
      },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("own").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").topCard.cardId === "BT2-044");

    expect(s.perm("first").topCard.cardId).toBe("BT2-045");
    expect(s.perm("first").stack).toHaveLength(1);
    expect(s.perm("second").topCard.cardId).toBe("BT2-044");
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT2-046")).toBe(true);
  });

  it("does nothing to an opposing Digimon without digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-052"], hand: [{ card: "BT2-105", as: "option" }] },
        1: { battleArea: [{ card: "BT2-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT2-105"));

    expect(s.perm("target").topCard.cardId).toBe("BT2-045");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("activates the same Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT2-105", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT2-045", as: "target", under: ["BT2-043"] }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("target").topCard.cardId).toBe("BT2-043");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT2-045")).toBe(true);
  });
});
