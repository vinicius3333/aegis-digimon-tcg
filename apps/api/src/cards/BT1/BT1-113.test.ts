import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-113.js";

describe("BT1-113 Forbidden Temptation", () => {
  it("prevents one opposing Digimon from attacking and blocking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-067", as: "attacker" }], hand: [{ card: "BT1-113", as: "option" }] }, 1: { battleArea: [{ card: "BT1-031", as: "target" }], deck: ["BT1-010"], security: ["BT1-010"] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("target"), "attack") &&
        observe(s.engine).isRestricted(s.perm("target"), "block"),
    );

    // Advance to the opponent's otherwise ordinary Main window. Its attack intent is
    // rejected by the restriction, not merely annotated in a ledger.
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    // Re-open player 0's normal attack flow and verify that the same target is not
    // an eligible blocker. `declareBlock` is the UI-facing response for that window.
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("target").permanentId }),
    ).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it("prevents every opposing Digimon from unsuspending in the next unsuspend phase", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-113", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT1-010", as: "first", suspended: true }, { card: "BT1-015", as: "second", suspended: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(true);
  });
});
