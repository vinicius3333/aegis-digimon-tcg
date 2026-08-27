import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-076.js";

describe("BT1-076 MegaKabuterimon", () => {
  it("gains 1 memory when attacking while the opponent has 2 suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-074", as: "attacker", under: ["BT1-076"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
        ],
        security: ["BT1-010"],
      },
    });

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

  it("still gains only 1 memory with 4 suspended opposing Digimon (Q927)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-074", as: "attacker", under: ["BT1-076"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
          { card: "BT1-070", suspended: true },
          { card: "BT1-071", suspended: true },
        ],
        security: ["BT1-010"],
      },
    });

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

  it("does not gain memory with only 1 suspended opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-074", as: "attacker", under: ["BT1-076"] }] },
      1: { battleArea: [{ card: "BT1-016", suspended: true }], security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(0);
  });

  it("does not count a suspended opposing Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-074", as: "attacker", under: ["BT1-076"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-085", suspended: true },
        ],
        security: ["BT1-010"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(0);
  });

  it("does not apply while MegaKabuterimon is the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-076", as: "attacker" }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
        ],
        security: ["BT1-010"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(0);
  });
});
