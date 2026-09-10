import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-002.js";

describe("EX1-002 Biyomon", () => {
  it("does not draw when its Digimon attacks another Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-002"] }], deck: ["BT1-009", "BT1-011"] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], security: ["BT1-009", "BT1-010"] },
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
      1: { security: ["BT1-009", "BT1-010"] },
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
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
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
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
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

  it("resets after a complete public turn loop and draws on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-002"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }],
        deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013"],
      },
      1: {
        deck: ["BT1-009", "BT1-011", "BT1-012", "BT1-013"],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
    });
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => p0.hand.length === 1);
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.perm("attacker").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("attacker").isSuspended);
    // A real second attack in the same turn is allowed after unsuspending, but the
    // inherited Once Per Turn marker prevents a second draw.
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(p0.hand).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === "Main");
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.turnSeat === 0 && s.state.phase === "Main");

    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(p0.hand).toHaveLength(2); // prior draw plus the normal draw at the start of this turn
    expect(attack()).toEqual({ ok: true });
    await settle(() => p0.hand.length === 3);
    expect(p0.hand).toHaveLength(3);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-002"),
    ).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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
      1: { security: ["BT1-009", "BT1-010"] },
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

  it("rejects an evolution from a level-3 source instead of treating it as a legal egg route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "source" }],
        hand: [{ card: "EX1-002", as: "rookie" }],
        deck: ["BT1-011"],
      },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("rookie").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("source").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("rookie").instanceId)).toBe(true);
  });
});
