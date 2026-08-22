import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-062.js";

describe("BT5-062 Mekanorimon", () => {
  it("has Blocker and can't attack on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-062", as: "mekanori" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("mekanori"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("mekanori"), "attack")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("mekanori").permanentId, target: { kind: "player" } }).ok).toBe(false);
  });

  it("unsuspends after deleting an opponent's Digimon in battle and surviving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-062", as: "mekanori", suspended: true }] }, 1: { battleArea: [{ card: "BT1-009", as: "attacker" }] } }, { autoSelectCards: true });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("mekanori").permanentId } })).toEqual({ ok: true });
    await settle(() => !s.perm("mekanori").isSuspended);
    expect(s.perm("mekanori").isSuspended).toBe(false);
  });
});
