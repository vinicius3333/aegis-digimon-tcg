import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-012.js";

describe("BT5-012 Monochromon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-012", as: "mono" }] }, 1: { security: ["BT1-009"] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("mono"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("mono").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === -2);
    expect(s.state.memory).toBe(-2);
  });

  it("can redirect an opponent attack as a Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-012", as: "mono" }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("mono"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("mono").permanentId })).toEqual({ ok: true });
    await settle(() => s.perm("mono").isSuspended);
    expect(s.perm("mono").isSuspended).toBe(true);
  });
});
