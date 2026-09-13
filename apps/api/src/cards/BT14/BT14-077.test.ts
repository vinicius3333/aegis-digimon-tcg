import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-077.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-077", () => {
  it("trashes the top two cards of both decks on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "TrashTopDeck",
        controller: "both",
        amount: 2,
      });
  });
  it("once per turn gains memory when an opponent deck card is trashed", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDiscardLibrary",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    }));
  it("trashes the top two cards from both decks on play and gains memory from the opponent mill", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-077", as: "skullsatamon" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullsatamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.trash.length >= 2 && s.state.players[1]!.trash.length >= 2 && s.state.memory === 4,
    );
    expect(s.state.players[0]!.trash.slice(-2).map((card) => card.cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.players[1]!.trash.slice(-2).map((card) => card.cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.memory).toBe(4);
  });

  it("naturally trashes the top two cards from both decks when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-074", as: "base" }],
          hand: [{ card: "BT14-077", as: "skullsatamon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullsatamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "BT14-077" &&
        s.state.players[0]!.trash.length >= 2 &&
        s.state.players[1]!.trash.length >= 2 &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009") &&
        s.state.players[0]!.deck.length === 0 &&
        s.state.players[1]!.deck.length === 1,
    );

    expect(s.perm("base").topCard?.cardId).toBe("BT14-077");
    // The public digivolution draw takes BT1-009 first; [When Digivolving]
    // then mills exactly the next two cards from the own deck.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.trash.slice(-2).map((card) => card.cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash.slice(-2).map((card) => card.cardId)).toEqual(["BT1-009", "BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("resets the opponent-deck trash watcher on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-077", as: "skullsatamon" },
            { card: "BT14-080", as: "ghoulmon", under: ["BT14-079"] },
          ],
          hand: [
            { card: "BT14-077", as: "copy" },
            { card: "BT1-009", as: "ownHand" },
          ],
          trash: Array(10).fill("BT1-009"),
          security: ["BT1-091", "BT1-091"],
          deck: Array(12).fill("BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentHand" }],
          security: ["BT1-091", "BT1-091", "BT1-091"],
          deck: Array(12).fill("BT1-009"),
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ghoulmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 9 && s.state.players[1]!.security.length === 2);
    expect(s.state.memory).toBe(9);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("copy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 7 && s.state.memory === 3);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("copy").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;

    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("ghoulmon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ghoulmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // The second mill left seven cards; the intervening draw left six before this mill of three.
    await settle(
      () => s.state.players[1]!.deck.length === 3 && s.state.players[1]!.security.length === 1 && s.state.memory === 5,
    );
    expect(s.state.memory).toBe(5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
