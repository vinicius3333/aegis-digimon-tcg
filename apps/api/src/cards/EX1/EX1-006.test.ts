import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-006.js";

describe("EX1-006 Garudamon", () => {
  it("gains 1 memory only when its Digimon attacks a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-008", as: "attacker", under: ["EX1-006"] }] },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 6, 3000);
    expect(s.state.memory).toBe(6);
  });

  it("does not gain memory when its Digimon attacks another Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-008", as: "attacker", under: ["EX1-006"] }] },
      1: { battleArea: [{ card: "BT1-001", as: "target", suspended: true }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 40);
    expect(s.state.memory).toBe(5);
  });
});
