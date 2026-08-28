import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-098.js";

describe("BT2-098 EDEN's Javelin", () => {
  it("draws one and scales the opposing DP reduction with hand size", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-033"], hand: [{ card: "BT2-098", as: "option" }, "BT2-034"], deck: ["BT2-035"] },
        1: { battleArea: [{ card: "BT2-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT2-035")).toBe(true);
  });

  it("uses the post-draw hand size and applies the total reduction to only one opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT2-033"],
        hand: [{ card: "BT2-098", as: "option" }, "BT2-034", "BT2-035"],
        deck: [{ card: "BT2-036", as: "drawn" }],
      },
      1: {
        battleArea: [
          { card: "BT1-062", as: "first" },
          { card: "BT1-062", as: "second" },
        ],
      },
    });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(s.state.players[0]!.hand).toHaveLength(3);
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options).toMatchObject({ min: 1, max: 1 });

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("first").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").currentDP === 5000);

    expect(s.perm("first").currentDP).toBe(5000);
    expect(s.perm("second").currentDP).toBe(8000);
  });

  it("uses the single drawn card for a -1000 DP reduction when the hand was otherwise empty", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT2-033"], hand: [{ card: "BT2-098", as: "option" }], deck: ["BT2-035"] },
        1: { battleArea: [{ card: "BT1-062", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 7000);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(7000);
  });

  it("activates its draw and scaled DP reduction from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT2-098", as: "securityOption", faceUp: true }],
          hand: ["BT2-034"],
          deck: [{ card: "BT2-035", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT2-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 2000);
  });
});
