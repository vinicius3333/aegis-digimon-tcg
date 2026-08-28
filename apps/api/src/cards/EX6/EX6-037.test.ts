import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-037.js";

describe("EX6-037 Spadamon", () => {
  it("pays 1 and places itself under a level 3 or Legend-Arms Digimon to draw", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      cost: { kind: "payMemory", memory: 1 },
      additionalCosts: [
        { kind: "place", position: "bottom", underOrFilters: [{ nameOrTrait: [{ tokens: ["Legend-Arms"] }] }] },
      ],
    }));
  it("draws two by trashing a Legend-Arms card on play and inherits low-DP deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: {
        kind: "trash",
        target: { filter: { zone: "hand", nameOrTrait: [{ match: "trait", tokens: ["Legend-Arms"] }] } },
      },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } } }],
    });
  });
});
