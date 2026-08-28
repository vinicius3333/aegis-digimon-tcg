import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT7-024.js";

/**
 * A3 for BT7-024 — self-digivolution-stack-trait condition.
 *
 * Card [Opponent's Turn]: "While a card with [Hybrid] in its traits is in this Digimon's
 * digivolution cards, your opponent's level 3 Digimon can't attack."
 *
 * The gate reads the SOURCE permanent's digivolution-stack traits via the Form ∪ Attribute ∪
 * Type union (CardSource.CardTraits). The [Hybrid] tag lives in `forms` (e.g. BT12-009), so the
 * prior `.types`-only read left this inert; the union fix makes it act.
 *
 * FAILS-WHEN-REVERTED: reading only `def.types` (dropping forms/attributes) leaves the [Hybrid]
 * card undetected => the gate never holds => the opponent Lv.3 attack is NOT blocked (RED).
 */

describe("BT7-024 — opponent Lv.3 can't attack while a [Hybrid] card is in this Digimon's stack", () => {
  it("draws once for each opposing Digimon without digivolution cards when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-024", as: "source" }], deck: ["BT1-001", "BT1-002", "BT1-003"] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "bare-a" },
          { card: "BT1-010", as: "bare-b" },
          { card: "BT1-011", under: ["BT1-001"], as: "stacked" },
        ],
      },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("blocks the opponent Lv.3 attack with a [Hybrid] stack card, allows it once removed", async () => {
    const s = setupEngine({
      // Seat-0 controls BT7-024 with a [Hybrid] card (BT12-009 — Hybrid is in its `forms`) in its
      // digivolution stack.
      0: { battleArea: [{ card: "BT7-024", dp: 5000, as: "me", under: ["BT12-009"] }] },
      // Seat-1 (the active turn player) has a level-3 Digimon (BT1-009) that wants to attack.
      1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "lv3" }] },
    });
    s.state.turnSeat = 1; // seat-1's turn => seat-0's BT7-024 [Opponent's Turn] gate can hold

    const me = s.perm("me");
    const lv3 = s.perm("lv3");

    await advance(s.engine).recompute();

    // The gate holds (a [Hybrid] card is in the stack), so the opponent Lv.3 carries the "attack"
    // restriction; the PRODUCTION attack intent is rejected.
    expect(observe(s.engine).isRestricted(lv3.permanentId, "attack")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: lv3.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    // REVERT-CONFIRM-RED: read only `def.types` in hasHybridTrait (Hybrid lives in `forms`) =>
    // the gate never holds => no restriction => this attack returns { ok: true } => RED.

    // Remove the [Hybrid] card from the stack: the gate fails on the next recompute and the
    // restriction lapses (continuous-recompute lifecycle).
    me.stack.splice(0, me.stack.length);
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(lv3.permanentId, "attack")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: lv3.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});
