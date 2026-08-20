import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-091.js";

describe("BT23-091 Wolkenapalm", () => {
  it("activates Delay in the CS attack window and deletes only a lowest-DP Digimon", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    expect(turn.actions[0].actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
    });
  });
  it("keeps lowest-DP deletion in Main and Security", () => {
    for (const trigger of ["Main", "Security"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && !entry.keywords) as any;
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", superlative: "lowestDP" } },
      });
      if (trigger === "Main" || trigger === "Security")
        expect(effect.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    }
  });
});
