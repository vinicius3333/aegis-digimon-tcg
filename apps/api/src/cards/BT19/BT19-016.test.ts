import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-016 Greymon", () => {
  it("preserves the optional hand-to-Tamer placement cost on play and deletion", () => {
    const card = runtimeCompiledCard("BT19-016");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "OnDeletion"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "place",
              target: {
                filter: {
                  zone: "hand",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
                },
                count: 1,
                from: ["hand"],
              },
              underFilter: { controller: "mine", kind: ["Tamer"] },
            },
          },
        ],
      })),
    ]);
  });
});
