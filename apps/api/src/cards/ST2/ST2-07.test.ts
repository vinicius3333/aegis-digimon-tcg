import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-07.js";

describe("ST2-07 Grizzlymon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST2-07", as: "grizzlymon" }] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("grizzlymon"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("grizzlymon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === -1 && s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("can suspend to redirect an opposing player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-07", as: "blocker" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-028", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const blockerId = s.perm("blocker").permanentId;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.perm("blocker").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("blocker").isSuspended).toBe(true);
  });
});
