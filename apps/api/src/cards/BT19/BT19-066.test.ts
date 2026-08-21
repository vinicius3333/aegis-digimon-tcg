import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-066 Gizamon", () => {
  it("preserves Pagumon digivolution, trait discard for draw, and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-066");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { names: ["Pagumon"], cost: 0, isAlternate: true },
    ]);
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [{
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Composite", "Wicked God"], match: "trait" }],
              },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        }],
      },
      {
        trigger: "Static",
        actions: [],
        isInherited: true,
        keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
      },
    ]);
  });
});
