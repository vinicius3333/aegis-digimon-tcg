import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-057 Sparrowmon", () => {
  it("preserves attack-time RaptorSparrowmon digivolution, Save, and inherited Collision", () => {
    const card = runtimeCompiledCard("BT19-057");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Twilight", "Xros Heart"], cost: 0, isAlternate: true },
    ]);
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenAttacking",
        actions: [{
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["RaptorSparrowmon"], match: "name" }] },
          onto: { filter: { controller: "mine", kind: ["Tamer"] }, count: 1 },
          optional: true,
        }],
      },
      { trigger: "OnDeletion", actions: [], keywords: [{ keyword: "Save", raw: "＜Save＞" }] },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Collision", raw: "＜Collision＞" },
          duration: "permanent",
        }],
      },
    ]);
  });
});
