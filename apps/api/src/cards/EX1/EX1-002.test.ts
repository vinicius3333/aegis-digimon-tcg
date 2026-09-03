import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-002.js";

describe("EX1-002 Biyomon", () => {
  it("does not draw when its Digimon attacks another Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker", under: ["EX1-002"] }], deck: ["BT1-009", "BT1-011"] },
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
    await settle(() => false, 40);
    expect(p0.hand).toHaveLength(0);
  });

  it("draws once when its Digimon attacks a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker", under: ["EX1-002"] }], deck: ["BT1-009", "BT1-011"] },
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
      0: { battleArea: [{ card: "BT1-010", as: "attacker", under: ["EX1-002"] }], deck: ["BT1-009", "BT1-011", "BT1-012"] },
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
    await settle(() => false, 40);
    expect(p0.hand).toHaveLength(1);
  });
});
