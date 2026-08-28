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
      { 0: { hand: [{ card: "BT14-064", as: "source" }], deck: ["BT14-056", "BT1-001", "BT1-002"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-056"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-056")).toBe(true);
  });

  it("naturally fires the inherited once-per-turn watcher when another friendly Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-067", as: "source", under: ["BT14-064"] },
            { card: "BT14-055", as: "deleted" },
          ],
          deck: ["BT14-056", "BT1-001", "BT1-002"],
        },
        1: { hand: [{ card: "BT13-011", as: "deleter" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-056"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-056")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-055")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-055")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });
});
