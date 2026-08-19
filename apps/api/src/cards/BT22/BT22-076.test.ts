import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-076.js";

describe("BT22-076 ShinMonzaemon", () => {
  it("reduces only Ver.1 digivolutions into ShinMonzaemon", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "Static")?.actions[0] as any;
    expect(replacement).toMatchObject({
      event: "wouldDigivolve",
      into: { nameOrTrait: [{ tokens: ["ShinMonzaemon"], match: "name" }] },
      actions: [{ mode: "reduceCost", amount: 2 }],
    });
  });

  it("places either player's qualifying Digimon into security after trashing the bottom face-down card", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        source: {
          filter: { controllerDefault: "any", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          count: 1,
        },
        cost: {
          kind: "trash",
          target: { filter: { isSelfRef: true, faceDown: true, position: "bottom" }, isSelf: true },
        },
      });
    }
  });
});
