import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-074.js";

describe("EX12-074 Genshi Continent & Ashino Island", () => {
  it("keeps the security attack trigger restricted to your turn and once per turn", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isSecurity: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenAttacking",
            actions: [
              expect.objectContaining({
                kind: "Digivolve",
                from: ["hand"],
                payCost: true,
                reduceCost: 1,
                optional: true,
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("models the main security swap, reduced Shambala play, and security play limit", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main");
    expect(main?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1 },
      { kind: "SecurityManipulation", op: "placeAsSecurity", faceUp: true, toTop: false },
      { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3, optional: true },
    ]);

    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      target: { filter: { playCostLte: 5 } },
    });
  });
});
