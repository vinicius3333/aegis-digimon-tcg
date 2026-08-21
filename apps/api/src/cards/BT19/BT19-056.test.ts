import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-056 Monodramon", () => {
  it("preserves both distinct reveal slots and the inherited DP effect", () => {
    const card = runtimeCompiledCard("BT19-056");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [{
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Dragonkin", "Cyborg"], match: "trait" }] },
              count: 1,
              to: "hand",
            },
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Ryo Akiyama"], match: "name" }] },
              orFilters: [{ controllerDefault: "mine", kind: ["Option"], nameOrTrait: [{ tokens: ["Device"], match: "trait" }] }],
              count: 1,
              to: "hand",
            },
          ],
        }],
      },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] },
    ]);
  });
});
