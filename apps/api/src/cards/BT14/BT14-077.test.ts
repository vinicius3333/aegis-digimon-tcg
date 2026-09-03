import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-077.js";
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
        0: { hand: [{ card: "BT14-077", as: "skullsatamon" }], deck: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { deck: ["BT1-004", "BT1-005", "BT1-006"] },
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
    expect(s.state.players[0]!.trash.slice(-2).map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
    expect(s.state.players[1]!.trash.slice(-2).map((card) => card.cardId)).toEqual(["BT1-004", "BT1-005"]);
    expect(s.state.memory).toBe(4);
  });

  it("naturally trashes the top two cards from both decks when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-074", as: "base" }],
          hand: [{ card: "BT14-077", as: "skullsatamon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { deck: ["BT1-004", "BT1-005", "BT1-006"] },
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
        s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001") &&
        s.state.players[0]!.deck.length === 0 &&
        s.state.players[1]!.deck.length === 1,
    );

    expect(s.perm("base").topCard?.cardId).toBe("BT14-077");
    // The public digivolution draw takes BT1-001 first; [When Digivolving]
    // then mills exactly the next two cards from the own deck.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-001");
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.trash.slice(-2).map((card) => card.cardId)).toEqual(["BT1-002", "BT1-003"]);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash.slice(-2).map((card) => card.cardId)).toEqual(["BT1-004", "BT1-005"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-006"]);
  });
});
