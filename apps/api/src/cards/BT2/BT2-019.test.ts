import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-031.js";
import "./BT2-019.js";

describe("BT2-019 Phoenixmon", () => {
  it("gains 1 memory when attacking a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-019", as: "attacker" }] },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("Q998 gains memory before a declared player attack is blocked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-019", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-010"] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1 && s.state.memory === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not gain memory when attacking an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-019", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-003", as: "target", suspended: true }] },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(0);
  });
});
