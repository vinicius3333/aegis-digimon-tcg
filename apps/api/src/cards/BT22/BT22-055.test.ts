import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-055.js";

describe("BT22-055 Recomon", () => {
  it("trashes an Appmon Digimon from hand to draw two", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 2,
      optional: true,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
          },
          count: 1,
        },
      },
    });
  });
});
