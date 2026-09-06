import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST14-04.js";

describe("ST14-04 Phascomon", () => {
  it("has Blocker and can't attack players on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST14-04", as: "phas" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("phas"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("phas"), "attackPlayers")).toBe(true);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("phas"), "attackPlayers")).toBe(false);
  });

  it("redirects an opposing player attack through its Blocker window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST14-04", as: "phas" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "ST14-03", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("phas").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("phas").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
