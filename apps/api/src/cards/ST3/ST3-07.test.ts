import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST3-07.js";

describe("ST3-07 Unimon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST3-07", as: "unimon" }], security: ["ST3-02"] },
      1: { security: ["ST3-02"] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("unimon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("unimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === -1 && s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses printed Blocker in a real opponent attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-07", as: "unimon" }], security: ["ST3-02"] },
        1: { battleArea: [{ card: "ST3-02", as: "attacker" }], security: ["ST3-02"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("unimon").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("unimon").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
