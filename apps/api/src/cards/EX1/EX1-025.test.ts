import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-025.js";

describe("EX1-025 Salamon", () => {
  it("draws 1 from an inherited source at exactly 3 security and only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-028", as: "host", under: ["EX1-025"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-036", "BT1-009"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-025"),
    ).toHaveLength(1);

    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    await drainMicrotasks();
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-025"),
    ).toHaveLength(1);
  });

  it("checks the controller's security, not the opponent's, at the threshold boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-028", as: "host", under: ["EX1-025"] }],
        deck: ["BT1-009"],
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
    await drainMicrotasks();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-025")).toBe(false);
  });

  it("does not treat Salamon on top as its own inherited source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-025", as: "top" }],
        deck: ["BT1-009"],
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
    await drainMicrotasks();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-025")).toBe(false);
  });

  it("preserves Salamon in a legal evolution stack and draws through a public attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-005", as: "host" }],
        hand: [
          { card: "EX1-025", as: "salamon" },
          { card: "EX1-028", as: "angemon" },
        ],
        deck: ["BT1-009"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("salamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX1-025");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("angemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX1-028");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-005", "EX1-025"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-025")).toBe(true);
  });

  it("rejects an illegal evolution source and cannot gain the inherited draw", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host" }],
        hand: [{ card: "EX1-025", as: "salamon" }],
        deck: ["BT1-010"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("salamon").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("host").topCard.cardId).toBe("BT1-009");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-025"]);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-025")).toBe(false);
  });

  it("resets the inherited once-per-turn effect on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-028", as: "host", under: ["EX1-025"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-025"),
    ).toHaveLength(1);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    await drainMicrotasks();
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-025"),
    ).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("host").isSuspended).toBe(false);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 3);
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-025"),
    ).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
