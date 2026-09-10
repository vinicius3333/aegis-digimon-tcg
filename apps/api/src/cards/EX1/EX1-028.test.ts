import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-028.js";

describe("EX1-028 Angemon", () => {
  it("grants +1000 DP at exactly 3 security through a public player attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX1-028"] }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 7000 && s.state.players[1]!.security.length === 1);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("uses the controller's security count and does not activate below 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX1-028"] }],
        security: ["BT1-009", "BT1-010"],
      },
      1: { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("keeps Q3212's bonus after the controller falls to 2 security, then expires at opponent-turn end", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX1-028"] }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
        deck: ["BT1-012", "BT1-013"],
      },
      1: {
        battleArea: [{ card: "BT1-014", as: "opponentAttacker" }],
        security: ["BT1-009", "BT1-010"],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    await settle();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 7000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("activates only once per turn and resets on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX1-028"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
        deck: ["BT1-012", "BT1-013", "BT1-014"],
      },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"], deck: ["BT1-012", "BT1-013"] },
    });
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    await settle();
    s.state.memory = 10;
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });

    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 7000);
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(s.perm("host").currentDP).toBe(7000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("host").isSuspended).toBe(false);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 3);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("preserves Angemon as an inherited source through legal evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-046", as: "source" }],
        hand: [
          { card: "EX1-028", as: "angemon" },
          { card: "BT1-060", as: "host" },
        ],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("angemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-028");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT1-060");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT1-046", "EX1-028"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").currentDP === 7000);
    expect(s.perm("source").currentDP).toBe(7000);
  });

  it("rejects an illegal non-yellow evolution and cannot grant the inherited bonus", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "invalidSource" }],
        hand: [{ card: "EX1-028", as: "angemon" }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 5;
    await s.ready();
    const permanentId = s.perm("invalidSource").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("angemon").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("invalidSource").stack).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(s.perm("invalidSource").currentDP).toBe(3000);
  });

  it("does not use Angemon as an inherited effect while it is the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-028", as: "top" }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("top").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(s.perm("top").currentDP).toBe(6000);
  });
});
