import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-020.js";

describe("BT22-020 KausGammamon", () => {
  it("draws only after optionally placing a Gammamon-named Digimon from hand", () => {
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(whenAttacking).toMatchObject({ frequency: "OncePerTurn" });
    expect(whenAttacking?.actions[0]).toMatchObject({
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
            nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
          },
          count: 1,
          from: ["hand"],
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });
});
