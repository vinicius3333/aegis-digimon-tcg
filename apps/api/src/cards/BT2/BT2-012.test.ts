import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-031.js";
import "./BT2-012.js";

describe("BT2-012 Birdramon", () => {
  it("gets +4000 DP for the turn when attacking a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-012", as: "attacker" }] },
      1: { security: ["BT1-010"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").currentDP === s.perm("attacker").baseDP + 4000);
    expect(s.perm("attacker").currentDP).toBe(7000);
  });

  it("Q996 keeps the +4000 DP when the declared player attack is blocked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-012", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-010"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("attacker").currentDP).toBe(7000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not get +4000 DP when attacking an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-012", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-003", as: "target", suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("attacker").currentDP).toBe(3000);
  });
});
