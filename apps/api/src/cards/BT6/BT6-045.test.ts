import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-045.js";

describe("BT6-045 Bakomon", () => {
  it("gains 1 memory when attacking while the opponent has 2 suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-048", under: ["BT6-045"], as: "host" }] },
      1: {
        battleArea: [
          { card: "BT1-010", suspended: true },
          { card: "BT1-011", suspended: true },
        ],
        security: ["BT1-010"],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when the opponent has only 1 suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-048", under: ["BT6-045"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-010", suspended: true }], security: ["BT1-010"] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(0);
  });
});
