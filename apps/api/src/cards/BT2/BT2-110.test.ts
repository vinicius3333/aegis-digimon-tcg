import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-110.js";

describe("BT2-110 Trump Sword", () => {
  it("selects exactly one opposing unsuspended Digimon and excludes suspended and own Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-067", as: "own" }], hand: [{ card: "BT2-110", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT2-043", as: "first" },
          { card: "BT2-044", as: "second" },
          { card: "BT2-046", as: "suspended", suspended: true },
        ],
      },
    });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("suspended").permanentId);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("own").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT2-043", "BT2-046"]);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT2-044")).toBe(true);
  });

  it("activates its Main deletion effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT2-110", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT2-043", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
