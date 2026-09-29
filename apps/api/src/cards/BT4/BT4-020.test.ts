import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-020.js";
import "../BT13/BT13-095.js";
import "../BT2/BT2-084.js";

describe("BT4-020 ShineGreymon", () => {
  it("gains Security Attack +1 separately for each red or yellow Tamer suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-020", as: "shine" },
          { card: "BT1-085", as: "red" },
          { card: "BT1-087", as: "yellow" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    const fx = (s.engine as any).primitives as Primitives;
    await fx.suspend([s.perm("red").permanentId], { byEffectSeat: 0 });
    expect(observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack")).toBe(1);
    await fx.suspend([s.perm("yellow").permanentId], { byEffectSeat: 0 });

    expect(observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack")).toBe(2);
  });

  it("does not gain Security Attack when a non-red, non-yellow Tamer is suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-020", as: "shine" },
          { card: "BT1-086", as: "blue" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    const fx = (s.engine as any).primitives as Primitives;

    await fx.suspend([s.perm("blue").permanentId], { byEffectSeat: 0 });

    expect(observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack")).toBe(0);
  });
});

describe("BT4-020 ShineGreymon — KB Q&A rulings", () => {
  it("gains Security Attack +1 twice when red or yellow Tamers are suspended at two different timings (Q1176)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-020", as: "shine" }],
          hand: [
            { card: "BT13-095", as: "firstMarcus" },
            { card: "BT13-095", as: "secondMarcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const securityAttack = () => observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => securityAttack() === 1 && s.state.pendingDecision === undefined);
    expect(securityAttack()).toBe(1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => securityAttack() === 2 && s.state.pendingDecision === undefined);

    expect(s.perm("firstMarcus").isSuspended).toBe(true);
    expect(s.perm("secondMarcus").isSuspended).toBe(true);
    expect(securityAttack()).toBe(2);
  });

  it("checks two extra security cards after two Tamers were suspended at different timings (Q1177)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-020", as: "shine" },
            { card: "BT2-084", as: "sora" },
          ],
          hand: [{ card: "BT13-095", as: "marcus" }],
        },
        1: { security: 4 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const shineId = s.perm("shine").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").isSuspended && s.state.pendingDecision === undefined);
    expect(observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: shineId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length <= 1 && s.state.pendingDecision === undefined, 5000);

    expect(s.perm("sora").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
