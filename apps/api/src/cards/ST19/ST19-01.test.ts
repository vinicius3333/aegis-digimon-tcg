import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-01.js";

describe("ST19-01 Kyaromon", () => {
  it("inherits a once-per-turn draw when attacking with another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT15-023", under: ["ST19-01"], as: "attacker" },
          { card: "ST19-02", as: "another" },
        ],
        deck: [{ card: "BT1-010", as: "drawn" }, { card: "BT1-011", as: "notDrawn" }],
      },
      1: { security: [{ card: "BT1-010", as: "security" }] },
    });

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("attacker"));
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notDrawn").instanceId]);
  });

  it("does not draw when the attacking Digimon is alone", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-023", under: ["ST19-01"], as: "attacker" }], deck: [{ card: "BT1-010", as: "notDrawn" }] },
      1: { security: [{ card: "BT1-010", as: "security" }] },
    });
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("attacker"));
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.perm("attacker").suspended);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notDrawn").instanceId]);
  });

  it("does not draw twice from the same inherited effect in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-023", under: ["ST19-01"], as: "attacker" }, { card: "ST19-02", as: "another" }],
        deck: [{ card: "BT1-010", as: "first" }, { card: "BT1-011", as: "second" }],
      },
      1: { security: [{ card: "BT1-010", as: "security" }, { card: "BT1-011", as: "security2" }] },
    });
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("attacker"));
    for (let i = 0; i < 2; i += 1) {
      expect(s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      })).toEqual({ ok: true });
      await settle(() => s.perm("attacker").isSuspended);
      if (i === 0) await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    }
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("first").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("second").instanceId]);
  });
});
