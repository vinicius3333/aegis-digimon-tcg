import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
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

  it("draws before the opponent receives the Blocker response window (Q3189)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-002"] }],
        deck: ["BT1-009", "BT1-011"],
      },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }] },
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

    // The inherited [When Attacking] Draw 1 resolves before §12's public blocker
    // response. Observe both state and protocol, then answer with the real intent.
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(p0.hand).toHaveLength(1);
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("blocker").permanentId],
    });
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
  });

  it("does not draw again when a second player attack occurs in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-002"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }],
        deck: ["BT1-009", "BT1-011", "BT1-012"],
      },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => p0.hand.length === 2);
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(p0.hand).toHaveLength(1);
  });

  it("draws after a legal public egg-to-Biyomon evolution and higher-level host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "base" }],
        hand: [
          { card: "EX1-002", as: "rookie" },
          { card: "EX1-003", as: "host" },
        ],
        deck: ["BT1-009"],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rookie").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-002");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-003");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
  });
});
