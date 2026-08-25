import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-086.js";

describe("BT20-086 Altea", () => {
  it("sets memory at 3 when it starts your turn at 2 or less", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
  });

  it("places the qualifying black Digimon at the bottom before flipping security", () => {
    const effects = compiled.effects.filter((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          optional: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: {
              filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Cyborg", "Machine"] }] },
            },
          },
        },
      ],
    });
  });
});
