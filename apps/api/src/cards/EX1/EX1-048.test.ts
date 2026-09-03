import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-048.js";

describe("EX1-048 Andromon", () => {
  it("reveals 3, adds a level 6 Machine, and trashes the rest when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-047", as: "base" }],
          hand: [{ card: "EX1-048", as: "evo" }],
          deck: ["BT1-011", "BT11-072", "BT1-009", "BT1-010"],
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
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT11-072"));
    await settle(() => s.state.players[0]!.trash.length === 2 && s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT11-072")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("honors refusal and does not reveal the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-047", as: "base" }],
          hand: [{ card: "EX1-048", as: "evo" }],
          deck: ["BT1-011", "BT11-072", "BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-048");
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT11-072")).toBe(false);
  });

  it("reveals and trashes all three cards when no level 6 Machine is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-047", as: "base" }],
          hand: [{ card: "EX1-048", as: "evo" }],
          deck: ["BT1-011", "BT1-043", "BT1-009", "BT1-010"],
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
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-043")).toBe(false);
  });

  it("grants inherited Blocker to a Machine host on the opponent's turn through public turn flow", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-072", as: "host", under: ["EX1-048"] }],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-001", "BT1-001"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "attacker" }],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-001", "BT1-001"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not grant inherited Blocker to a non-Machine host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-111", as: "host", under: ["EX1-048"] }],
        hand: ["BT1-001"],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-001", "BT1-001"],
      },
      1: {
        hand: ["BT1-001"],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-001", "BT1-001"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
