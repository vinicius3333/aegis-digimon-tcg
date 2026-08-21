import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-068.js";

describe("EX10-068 Digimon Emperor", () => {
  it("returns an opponent Digimon to deck bottom before the optional same-color play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay")!;
    const play = effect.actions[1]!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(play).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      optional: true,
      target: {
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 4 },
          sameColorAsReturned: true,
        },
      },
      cost: {
        kind: "return",
        target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] } },
        to: "deckBottom",
      },
      abortOnDecline: true,
    });
  });
});
