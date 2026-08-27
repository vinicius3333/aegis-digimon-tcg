import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-103.js";

describe("BT5-103 A Blazing Storm of Metal!", () => {
  it("gives every Reboot Digimon +1000 DP and Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-068", as: "first" },
            { card: "BT5-070", as: "second" },
            { card: "BT5-071", as: "normal" },
          ],
          hand: [{ card: "BT5-103", as: "option" }],
        },
        1: { battleArea: [{ card: "BT5-068", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("first"), "Blocker") &&
        observe(s.engine).hasKeyword(s.perm("second"), "Blocker"),
    );
    expect(s.perm("first").currentDP).toBe(s.perm("first").baseDP + 1000);
    expect(s.perm("second").currentDP).toBe(s.perm("second").baseDP + 1000);
    expect(s.perm("normal").currentDP).toBe(s.perm("normal").baseDP);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP);
    expect(observe(s.engine).hasKeyword(s.perm("normal"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponent"), "Blocker")).toBe(false);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "ownerTurnEnd", 0);
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 0);
    await advance(s.engine).recompute();
    expect(s.perm("first").currentDP).toBe(s.perm("first").baseDP + 1000);
    expect(observe(s.engine).hasKeyword(s.perm("first"), "Blocker")).toBe(true);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "opponentTurnEnd", 1);
    advance(s.engine).ledgers.continuous.sweep(s.state, "opponentTurnEnd", 1);
    await advance(s.engine).recompute();
    expect(s.perm("first").currentDP).toBe(s.perm("first").baseDP);
    expect(observe(s.engine).hasKeyword(s.perm("first"), "Blocker")).toBe(false);
  });

  it("security prevents opposing Digimon from attacking players and adds itself to hand", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT5-103", as: "securityOption", faceUp: true }],
        battleArea: [{ card: "BT5-047", as: "ownTarget" }],
      },
      1: { battleArea: [{ card: "BT5-047", as: "target" }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "attackPlayers")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("ownTarget"), "attackPlayers")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attackPlayers")).toBe(false);
  });
});
