import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-057.js";

describe("EX8-057", () => {
  it("reveals 3 for an NSo and Fallen Angel card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("contains the printed on-play and inherited effects", () => expect(compiled.effects).toHaveLength(2));
  it("exposes the zero-cost NSo level-2 evolution route", () =>
    expect(digivolutionRequirementsFor("EX8-057")).toContainEqual({
      level: 2,
      traits: ["NSo"],
      cost: 0,
      isAlternate: true,
    }));
  it("inherits a once-per-turn draw then trash effect when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "Trash", target: { count: 1 } },
      ],
    }));
  it("adds one NSo and one Fallen Angel from the revealed top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-057", as: "source" }],
          deck: ["BT1-010", "BT11-080", "BT26-062", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.cardId === "BT26-062") &&
        player.hand.some((card) => card.cardId === "BT11-080") &&
        player.deck.length === 2 &&
        s.state.pendingDecision === undefined,
    );
    expect(player.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT26-062", "BT11-080"]));
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-010"]);
  });
  it("puts all three revealed cards back on the deck when neither trait matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-057", as: "source" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.deck.length === 3 && s.state.pendingDecision === undefined);

    expect(player.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-057")).toBe(true);
    expect(player.hand).toHaveLength(0);
    expect(player.deck).toHaveLength(3);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011", "BT1-012"]);
  });
  it("draws and trashes only on the first inherited attack each turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-057"] }],
          hand: [{ card: "BT1-010", as: "filler" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.trash.length === 1 && player.hand.length === 1);
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
    expect(player.hand.some((card) => ["BT1-010", "BT1-001"].includes(card.cardId))).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(player.deck).toHaveLength(1);
    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
  });

  it("digivolves for 0 from a level-2 NSo stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX8-006", as: "demimeramon" },
        hand: [{ card: "EX8-057", as: "demidevimon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("demimeramon").permanentId,
        instanceId: s.inst("demidevimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("demimeramon").topCard.cardId === "EX8-057");

    expect(s.state.memory).toBe(0);
    expect(s.perm("demimeramon").stack.map((card) => card.cardId)).toEqual(["EX8-006"]);
  });
});
