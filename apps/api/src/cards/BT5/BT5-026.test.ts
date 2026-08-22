import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-026.js";

describe("BT5-026 Coelamon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-026", as: "coelamon" }] }, 1: { security: ["BT1-009"] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("coelamon"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("coelamon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === -2);
    expect(s.state.memory).toBe(-2);
  });

  it("redirects an opponent attack through its Blocker window", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-026", as: "coelamon" }], security: ["BT1-009"] }, 1: { battleArea: [{ card: "BT1-009", as: "attacker" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("coelamon").permanentId })).toEqual({ ok: true });
    await settle(() => s.perm("coelamon").isSuspended);
    expect(s.perm("coelamon").isSuspended).toBe(true);
  });
});
