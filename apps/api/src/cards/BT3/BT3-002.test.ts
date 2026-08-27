import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-021.js";
import "./BT3-002.js";

describe("BT3-002 DemiVeemon", () => {
  it("draws 1 when its host with Jamming attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-021", as: "host", under: ["BT3-002"] }],
        deck: [{ card: "BT1-012", as: "drawn" }],
      },
      1: { security: ["BT1-011"] },
    });

    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId), 5000);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("does not draw when its host lacks Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-022", as: "host", under: ["BT3-002"] }], deck: [{ card: "BT1-012", as: "top" }] },
      1: { security: ["BT1-011"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
  });

  it("draws only once when the Jamming host attacks twice in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-021", as: "host", under: ["BT3-002"] }],
        deck: [
          { card: "BT1-012", as: "first" },
          { card: "BT1-013", as: "second" },
        ],
      },
      1: { security: ["BT1-011", "BT1-012"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("first").instanceId), 5000);
    await settle(() => !observe(s.engine).isAttacking(), 5000);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("first").instanceId]);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("second").instanceId)).toBe(true);
  });
});
