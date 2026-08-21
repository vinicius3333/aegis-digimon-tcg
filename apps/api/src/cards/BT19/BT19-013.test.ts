import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-013 Starmon", () => {
  it("preserves the leaving-play stack save and filtered under-Tamer revival", () => {
    const card = runtimeCompiledCard("BT19-013");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            actions: [
              {
                kind: "PlaceUnder",
                from: ["digivolutionCards"],
                optional: true,
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
                  },
                  count: 3,
                  upTo: true,
                },
              },
            ],
          },
        ],
      },
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["underTamers"],
            payCost: false,
            optional: true,
            target: {
              filter: { controller: "mine", kind: ["Digimon"], zone: "underTamers", playCost: { op: "lte", value: 4 } },
            },
          },
        ],
      },
    ]);
  });
});
