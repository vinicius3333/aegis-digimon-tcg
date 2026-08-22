import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-025.js";

describe("BT23-025 MarineAngemon", () => {
  it("returns the lowest-level opposing Digimon on play and when digivolving", () => {
    expect(compiled.effects.filter(({ trigger }) => ["OnPlay", "WhenDigivolving"].includes(trigger))).toHaveLength(2);
    expect(compiled.effects.find(({ trigger }) => trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Return", target: { filter: { superlative: "lowestLevel" } } });
  });

  it("defers the Security play until the security battle ends and schedules turn-end deletion", async () => {
    const security = compiled.effects.find(({ trigger }) => trigger === "Security")!;
    expect(security.actions).toEqual([
      expect.objectContaining({ kind: "PlayWithoutCost", payCost: false }),
      expect.objectContaining({ kind: "DelayedDeletePlayed" }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
