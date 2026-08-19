import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-013.js";

describe("BT22-013 WarGreymon", () => {
  it("targets Agumon for the hand digivolution, deletes lowest DP, and trashes top security as inherited", () => {
    const handMain = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(handMain).toMatchObject({ isFromHand: true });
    expect(handMain?.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Agumon"], match: "name" }],
        },
      },
      costOverride: 6,
      ignoreRequirements: true,
    });

    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({ kind: "Modal", choose: 1 });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Trash",
            target: { filter: { controller: "opponent", zone: "security", position: "top" }, count: 1 },
          }),
        ],
      }),
    );
  });
});
