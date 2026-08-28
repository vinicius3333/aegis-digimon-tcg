import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-046.js";

describe("BT13-046 Kentaurosmon", () => {
  it("contains the security-count reveal effects and the attack cost/debuff sequence", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "GainMemory", amount: 3, condition: { kind: "totalSecurityCount", op: "lte", value: 6 } },
        {
          kind: "HandRevealAdd",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
          securityFilter: { colors: ["Yellow"] },
          toTop: true,
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({ kind: "Unsuspend", abortOnDecline: true }),
        expect.objectContaining({ kind: "ModifyDP", amount: -7000 }),
      ],
    });
  });

  it("at six total security gains 3 memory and places a yellow hand card face down on top", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-046", as: "kent" }],
          security: [{ card: "BT1-001", as: "old-top" }, "BT1-002", "BT1-003"],
          hand: [{ card: "BT13-095", as: "dual-yellow" }],
        },
        1: { security: ["BT1-004", "BT1-005", "BT1-006"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("kent"));
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("dual-yellow").instanceId);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.security[1]!.instanceId).toBe(s.inst("old-top").instanceId);
  });

  it("must reveal at the threshold but returns a non-yellow card to hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-046", as: "kent" }], security: ["BT1-001"], hand: ["BT13-047", "BT13-036"] },
        1: { security: ["BT1-002"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("kent"));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(true);
  });

  it("does nothing above six total security cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-046", as: "kent" }], security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"], hand: ["BT13-095"] },
        1: { security: ["BT1-005", "BT1-006", "BT1-007"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("kent"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });

  it("pays top security to unsuspend itself and debuff once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-046", as: "kent", suspended: true }], security: [{ card: "BT1-001", as: "top-security" }, "BT1-002"] },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseDP = s.perm("target").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("kent"));
    await settle(() => !s.perm("kent").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("top-security").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(baseDP - 7000);
    s.perm("kent").isSuspended = true;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("kent"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("kent").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(baseDP - 7000);
  });

  it("declining the attack cost preserves security, suspension, and opposing DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-046", as: "kent", suspended: true }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const baseDP = s.perm("target").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("kent"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("kent").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(baseDP);
  });

  it("digivolves from a yellow level 5 for exactly 5 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-041", as: "base" }],
        hand: [{ card: "BT13-046", as: "kent" }],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
      1: { security: ["BT1-005", "BT1-006", "BT1-007"] },
    });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("kent").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-046");
    expect(s.state.memory).toBe(1);
  });
});
