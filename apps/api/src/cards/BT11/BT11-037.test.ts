import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-037.js";

describe("BT11-037 Kotemon", () => {
  it("has Blocker and can't attack players on its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-037", as: "kotemon" }] },
      1: { security: ["BT1-001"] },
    });

    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("kotemon"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("kotemon"), "attackPlayers")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kotemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("the player-attack restriction is absent outside its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-037", as: "kotemon" }] } });
    s.state.turnSeat = 1;

    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("kotemon"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("kotemon"), "attackPlayers")).toBe(false);
  });
});
