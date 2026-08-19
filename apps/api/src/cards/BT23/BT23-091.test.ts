import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-091.js";

describe("BT23-091 Wolkenapalm", () => {
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

  it("arms a separate Delay deletion when a CS Digimon attacks", () => {
    const turn = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    const delay = compiled.effects.find((entry) =>
      entry.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(delay.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { superlative: "lowestDP" } } });
  });
});
