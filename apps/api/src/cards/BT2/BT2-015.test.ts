import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-031.js";
import "./BT2-015.js";

describe("BT2-015 Garudamon", () => {
  it("draws 1 when attacking a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-015", as: "attacker" }], deck: [{ card: "BT1-010", as: "drawn" }] },
      1: { security: ["BT1-011"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("Q997 draws before a declared player attack is blocked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-015", as: "attacker" }], deck: [{ card: "BT1-010", as: "drawn" }] },
      1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-011"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).blockingSeat() === 1 &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not draw when attacking an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-015", as: "attacker" }], deck: [{ card: "BT1-010", as: "notDrawn" }] },
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
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("notDrawn").instanceId);
  });
});
