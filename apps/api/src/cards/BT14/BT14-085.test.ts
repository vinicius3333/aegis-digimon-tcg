import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-085.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-085", () => {
  it("reveals three and adds a Vegetation, Plant, or Fairy Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand", filter: { nameOrTrait: [{ tokens: ["Vegetation", "Plant", "Fairy"], match: "trait" }] } }] }));
  it("plays itself from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
  it("adds a revealed Vegetation Digimon and bottoms the remaining reveal", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-085", as: "mimi" }], deck: ["BT14-044", "BT1-001", "BT1-002"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mimi").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-044"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-044")).toBe(true);
    expect(s.state.players[0]!.deck.slice(-2).map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });
});
