import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-003.js";

describe("EX6-003 Cupimon", () => {
  it("returns one security card to hand and places an Angel excluding Fallen Angel as security", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            count: 1,
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [{ match: "trait", tokens: ["Angel", "Archangel", "Three Great Angels"] }],
            },
          },
          toTop: false,
        },
      ],
    });
  });
});
