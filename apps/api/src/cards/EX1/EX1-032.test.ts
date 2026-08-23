import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-032.js";

describe("EX1-032 Magnadramon", () => {
  it("may trash the top security card to unsuspend when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-029", as: "base", suspended: true }],
          hand: [{ card: "EX1-032", as: "evo" }],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
  });

  it("recovers 1 on attack with 3 or fewer security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-032", as: "magnadramon" }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
        deck: [{ card: "BT1-009", as: "recovered" }],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
  });
});
