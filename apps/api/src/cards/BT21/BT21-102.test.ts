import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-102.js";

describe("BT21-102 Tai Kamiya", () => {
  it("verifies memory setting, attack draw cost, scalable Main play, and Security play", () => {
    const start = compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn");
    expect(start?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });

    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
    });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "CostModifier",
      mode: "raiseCeiling",
      costType: "playcost",
      amount: 1,
      scaling: { unit: "colors" },
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { playCostLte: 2, nameOrTrait: [{ tokens: ["ADVENTURE", "Hero"], match: "trait" }] } },
    });
    expect(main?.actions[2]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      target: { filter: { isSelfRef: true } },
    });

    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [
          { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
        ],
      }),
    );
  });
});
