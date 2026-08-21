import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-061 RaptorSparrowmon", () => {
  it("preserves DigiXros-only identity, both reveal triggers, Save placement, and Collision", () => {
    const card = runtimeCompiledCard("BT19-061");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Xros Heart"], cost: 2, isAlternate: true },
    ]);
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Sparrowmon"], digiXrosOnly: true }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [{
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }] }, count: 1, to: "hand" }],
          rest: "trash",
        }],
      })),
      {
        trigger: "OnDeletion",
        actions: [{
          kind: "PlaceUnder",
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }] }, count: 1, from: ["hand", "trash"] },
          underFilter: { controller: "mine", kind: ["Tamer"] },
        }],
      },
      { trigger: "YourTurn", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Collision", raw: "＜Collision＞" }, duration: "permanent" }] },
    ]);
  });
});
