import { describe, expect, it } from "vitest";
import { compiled as BT24_049 } from "./BT24-049.js";

describe("BT24-049 Parrotmon", () => {
  it("gates the lowest-DP bounce on effect entry", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_049.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Return",
        to: "hand",
        condition: { kind: "triggerEnteredByEffect" },
        target: { filter: { controller: "opponent", suspended: true, superlative: "lowestDP" } },
      });
    }
  });
  it("trashes the opponent's top security after a battle deletion once per turn", () => {
    const inherited = BT24_049.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).event).toBe("whenDeletesInBattle");
  });
});
