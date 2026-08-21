import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-055 Monitamon", () => {
  it("preserves the two-slot reveal contract and the one-match ruling", () => {
    const card = runtimeCompiledCard("BT19-055");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnDeletion",
        actions: [{
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }, { tokens: ["Twilight"], match: "trait", orPrevious: true }] },
              count: 1,
              to: "hand",
            },
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }, { tokens: ["Twilight"], match: "trait", orPrevious: true }] },
              count: 1,
              to: "underTamer",
              requiresMinRevealed: 2,
            },
          ],
        }],
      },
      { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
    ]);
  });
});
