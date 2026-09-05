import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-15.js";

describe("ST9-15 Hell Masquerade", () => {
  it("grants +2000 DP and Piercing while a blue Digimon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST9-02", as: "blue" },
          { card: "ST9-07", as: "target" },
        ],
        hand: [{ card: "ST9-15", as: "option" }],
        deck: ["BT1-001"],
      },
      1: { deck: ["BT1-002"] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const dpDecision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dpDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("blue").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets" && s.decisions.length >= 2);
    const piercingDecision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: piercingDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("blue").currentDP === s.perm("blue").baseDP + 2000 && observe(s.engine).hasPierce(s.perm("target")),
    );
    expect(s.perm("blue").currentDP).toBe(s.perm("blue").baseDP + 2000);
    expect(observe(s.engine).hasPierce(s.perm("blue"))).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(true);
  });

  it("grants +2000 DP but no Piercing when no blue Digimon is in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST9-07", as: "target" }], hand: [{ card: "ST9-15", as: "option" }] },
      1: { deck: ["BT1-002"] },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.pendingDecision === undefined && s.perm("target").currentDP === s.perm("target").baseDP + 2000,
    );
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP + 2000);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(false);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });

  it("adds itself to its owner's hand when revealed in Security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST9-15", as: "securityOption" }], deck: ["BT1-001"] },
      1: { deck: ["BT1-002"] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId)).toBe(true);
  });
});
