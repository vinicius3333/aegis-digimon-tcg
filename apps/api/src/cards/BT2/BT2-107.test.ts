import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-107.js";

describe("BT2-107 Darkness Claw", () => {
  it("gives exactly one selected own Digimon +3000 DP for the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-067", as: "first" },
          { card: "BT2-068", as: "second" },
        ],
        hand: [{ card: "BT2-107", as: "option" }],
      },
      1: { battleArea: [{ card: "BT2-069", as: "opponent" }] },
    });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("opponent").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").currentDP === 4000);
    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(4000);
    expect(s.perm("opponent").currentDP).toBe(2000);
  });

  it("gains 2 memory from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-107", as: "securityOption", faceUp: true }] } });
    s.state.memory = 0;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.memory).toBe(2);
  });
});
