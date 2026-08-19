import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-015.js";

describe("BT24-015 MetalGreymon", () => {
  it("plays itself from security without battling when the opponent has a level 6+ Digimon", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security")?.actions?.[0] as any;
    expect(security).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["security"],
      payCost: false,
      withoutBattle: true,
    });
    expect(security.condition).toMatchObject({
      kind: "opponentHas",
      filter: { levelComparison: { op: "gte", value: 6 } },
    });
  });

  it("keeps lowest-DP attack-target-change deletion and inherited Blocker deletion", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns") as any;
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(allTurns.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttackTargetSwitched" });
    expect(allTurns.actions[0].actions[0].target.filter.superlative).toBe("lowestDP");
    expect(inherited.actions[0].target.filter.keywords).toEqual(["Blocker"]);
  });
});
