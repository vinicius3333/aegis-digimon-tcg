import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-010 Shoutmon X4", () => {
  it("preserves its Xros materials and optional replacement into a Tamer", () => {
    const card = runtimeCompiledCard("BT19-010");
    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      digiXrosRequirement: [
        {
          materials: [
            { names: ["Shoutmon"] },
            { names: ["Ballistamon"] },
            { names: ["Dorulumon"] },
            { names: ["Starmons"] },
          ],
          cost: 2,
        },
      ],
    });
    expect(card?.effects).toMatchObject([
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            sourceFilter: { isSelfRef: true },
            mode: "instead",
            optional: true,
            actions: [
              {
                kind: "PlaceUnder",
                target: {
                  filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] },
                  count: 3,
                  upTo: true,
                  from: ["digivolutionCards"],
                },
                underFilter: { controller: "mine", kind: ["Tamer"] },
              },
            ],
          },
        ],
      },
    ]);
  });
});
