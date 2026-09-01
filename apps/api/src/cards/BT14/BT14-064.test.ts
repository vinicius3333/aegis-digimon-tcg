import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-064.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-064", () => {
  it("reveals three to optionally play a D-Brigade or DigiPolice card costing four or less on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "trash",
        add: [{ to: "play", optional: true, filter: { playCostLte: 4 } }],
      });
  });
  it("inherits a once-per-turn Commandramon play response when another own Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "play", payCost: false }] }],
        },
      ],
    }));
  it("plays a revealed low-cost D-Brigade card", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-064", as: "source" }], deck: ["BT14-056", "BT14-082", "BT14-089"] } },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-056") &&
        s.state.players[0]!.deck.length === 0 &&
        ["BT14-082", "BT14-089"].every((cardId) => s.state.players[0]!.trash.some((card) => card.cardId === cardId)),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-056")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT14-082", "BT14-089"]);
  });

  it("naturally resolves the same reveal-and-play clause when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-061", as: "base" }],
          hand: [{ card: "BT14-064", as: "evolving" }],
          // Digivolution draws one card before [When Digivolving]. Keep that
          // mandatory draw separate so Hi-Commandramon is in the three-card
          // reveal rather than being consumed by the evolution draw.
          deck: ["AD1-003", "BT14-060", "AD1-001", "AD1-002"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-060") &&
        s.state.players[0]!.deck.length === 0 &&
        s.state.players[0]!.hand.some((card) => card.cardId === "AD1-003") &&
        ["AD1-001", "AD1-002"].every((cardId) => s.state.players[0]!.trash.some((card) => card.cardId === cardId)),
    );

    expect(s.perm("base").topCard.cardId).toBe("BT14-064");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-060")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["AD1-001", "AD1-002"]);
  });

  it("naturally fires the inherited once-per-turn watcher when another friendly Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-067", as: "source", under: ["BT14-064"] },
            { card: "BT14-055", as: "deleted" },
          ],
          deck: ["BT16-050", "BT14-082", "BT14-089", "BT14-083", "BT14-084", "BT14-085", "BT14-087"],
        },
        1: { hand: [{ card: "BT13-011", as: "deleter" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-050") &&
        s.state.players[0]!.deck.map((card) => card.cardId).join(",") ===
          "BT14-083,BT14-084,BT14-085,BT14-087,BT14-082,BT14-089" &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT14-055"),
    );

    expect(
      s.decisions.some(
        ({ req }) =>
          req.kind === "selectCards" &&
          req.sourceCardId === "BT14-064" &&
          req.options?.visibleCards?.some(({ cardId }) => cardId === "BT16-050"),
      ),
    ).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-050")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-055")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-055")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT14-083",
      "BT14-084",
      "BT14-085",
      "BT14-087",
      "BT14-082",
      "BT14-089",
    ]);
    expect(s.state.players[0]!.deck.every((card) => card.faceUp === false)).toBe(true);
  });
});
