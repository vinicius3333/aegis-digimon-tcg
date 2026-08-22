import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-008 Shoutmon", () => {
  it("preserves free Tamer-onto OmniShoutmon digivolution, deletion search, and inherited Rush", () => {
    const card = runtimeCompiledCard("BT19-008");
    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 2, traits: ["Xros Heart"], cost: 0, isAlternate: true }],
    });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Digivolve",
            payCost: false,
            onto: { filter: { kind: ["Tamer"] } },
            into: { nameOrTrait: [{ tokens: ["OmniShoutmon"], match: "name" }] },
          },
        ],
      },
      {
        trigger: "OnDeletion",
        actions: [
          { kind: "RevealAdd", revealCount: 3, rest: "deckBottom" },
          { kind: "PlaceUnder", abortOnDecline: true },
        ],
      },
      { trigger: "YourTurn", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" } }] },
    ]);
  });
});
