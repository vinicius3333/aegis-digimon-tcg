import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-002.js";

describe("EX1-002 Biyomon", () => {
  it("does not draw when its Digimon attacks another Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-002"] }], deck: ["BT1-009", "BT1-011"] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], security: ["BT1-001", "BT1-001"] },
    });
    const p0 = s.state.players[0]!;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(p0.hand).toHaveLength(0);
  });

  it("draws once when its Digimon attacks a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-002"] }], deck: ["BT1-009", "BT1-011"] },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    const p0 = s.state.players[0]!;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.length === 1);
    expect(p0.hand).toHaveLength(1);
  });

  it("does not draw again when a second player attack occurs in the same turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-002"] }], deck: ["BT1-009", "BT1-011", "BT1-012"] },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    const p0 = s.state.players[0]!;
    await s.ready();
    const attack = () => s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    expect(attack()).toEqual({ ok: true });
    await settle(() => p0.hand.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(p0.hand).toHaveLength(1);
  });

  it("draws after a legal public egg-to-Biyomon evolution and higher-level host", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "egg" }, hand: [{ card: "EX1-002", as: "rookie" }, { card: "EX1-003", as: "host" }], deck: ["BT1-009"] },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("rookie").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX1-002");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({ ok: true });
    await settle(() => !s.perm("egg").inBreeding);
    s.state.phase = Phase.Main;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("host").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX1-003");
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("egg").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
  });
});
