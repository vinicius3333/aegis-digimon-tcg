import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-054.js";
import "./BT2-072.js";
import "./BT2-103.js";

describe("BT2-103 Spiral Sword", () => {
  it("gives one Digimon +3000 DP", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT2-052", as: "target" }], hand: [{ card: "BT2-103", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("gives +3000 DP to exactly one selected own Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-052", as: "first" },
          { card: "BT2-053", as: "second" },
        ],
        hand: [{ card: "BT2-103", as: "option" }],
      },
      1: { battleArea: [{ card: "BT2-052", as: "opponent" }] },
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
    await settle(() => s.perm("second").currentDP === s.perm("second").baseDP + 3000);

    expect(s.perm("first").currentDP).toBe(s.perm("first").baseDP);
    expect(s.perm("second").currentDP).toBe(s.perm("second").baseDP + 3000);
  });

  it("unsuspends one of its Digimon with Blocker from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT2-103", as: "securityOption", faceUp: true }],
          battleArea: [{ card: "BT2-054", as: "blocker", suspended: true }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("Security chooses exactly one own Blocker and excludes non-Blockers", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT2-103", as: "securityOption", faceUp: true }],
          battleArea: [
            { card: "BT2-052", as: "nonBlocker", suspended: true },
            { card: "BT2-054", as: "firstBlocker", suspended: true },
            { card: "BT2-072", as: "secondBlocker", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("firstBlocker").isSuspended).toBe(false);
    expect(s.perm("secondBlocker").isSuspended).toBe(true);
    expect(s.perm("nonBlocker").isSuspended).toBe(true);
  });
});
