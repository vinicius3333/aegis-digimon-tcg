import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-005.js";

describe("BT23-005 Elizamon", () => {
  it("reduces this Digimon's eligible digivolution cost by one", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);

    expect(effect?.actions).toEqual([
      {
        kind: "Replacement",
        event: "wouldDigivolve",
        sourceFilter: { isSelfRef: true },
        into: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
        },
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            mode: "reduceCost",
            amount: 1,
            raw: "reduce the digivolution cost by 1",
          },
        ],
      },
    ]);
  });

  it("keeps the inherited Your Turn +2000 DP effect", () => {
    expect(compiled.effects).toContainEqual({
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    });
  });
});
