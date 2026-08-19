import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-061.js";

describe("BT22-061 Vademon", () => {
  it("reduces only Ver.2 digivolutions into Vademon by its face-down stack count", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "Static")?.actions[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      into: { nameOrTrait: [{ tokens: ["Vademon"], match: "name" }] },
      actions: [
        {
          mode: "reduceCost",
          amount: 1,
          scaling: { per: 1, unit: "digivolutionCards", filter: { isSelfRef: true, faceDown: true } },
        },
      ],
    });
  });

  it("trashes the bottom face-down card before the shared once-per-turn De-Digivolve and return", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Return",
        to: "hand",
        cost: {
          kind: "trash",
          target: { filter: { isSelfRef: true, faceDown: true, position: "bottom" }, isSelf: true },
        },
      });
    }
  });
});
