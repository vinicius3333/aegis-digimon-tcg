import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-056.js";

describe("BT19-056", () => {
  it("preserves the dual Dragonkin/Cyborg and Ryo/Device reveal search plus inherited DP", () => {
    const card = runtimeCompiledCard("BT19-056");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [
              { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["Dragonkin", "Cyborg"] }] } },
              {
                count: 1,
                to: "hand",
                filter: { nameOrTrait: [{ tokens: ["Ryo Akiyama"] }] },
                orFilters: [{ kind: ["Option"], nameOrTrait: [{ tokens: ["Device"] }] }],
              },
            ],
            rest: "deckBottom",
          },
        ],
      },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] },
    ]);
  });
});
