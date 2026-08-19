import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-019.js";

describe("BT23-019 Gekomon", () => {
  it("trashes up to two digivolution cards from one opposing Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "TrashDigivolution",
        target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
        amount: 2,
      });
    }
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
