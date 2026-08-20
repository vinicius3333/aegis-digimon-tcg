import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-058.js";

describe("BT1-058 Chirinmon", () => {
  it("gains 3 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-058", as: "attacker" }] },
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
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("gains 3 memory from a low memory position without changing the printed amount", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-058", as: "attacker" }] },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);

    expect(s.state.memory).toBe(4);
  });

  it("pays the delayed 3 after Chirinmon is deleted, in addition to passing at 3 memory (Q917/Q918)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-058", as: "attacker" }] },
      1: { security: ["BT1-062"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && s.state.players[0]!.battleArea.length === 0);

    await advance(s.engine).runTurn(0);

    expect(s.state.memory).toBe(-6);
  });
});
