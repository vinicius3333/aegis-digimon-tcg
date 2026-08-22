import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-048.js";

describe("EX10-048 Myotismon", () => {
  it("proves play-cost replacement, same-target On Play/On Deletion buffs, and deletion Tamer play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { isSelfRef: true }, cost: { kind: "deleteOwn", reduceCostBy: 4, raw: expect.any(String) } }],
    });
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Blocker" }, target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"] }, count: 1 } },
          { kind: "GainKeyword", keyword: { keyword: "Retaliation" }, target: { sameTarget: true }, duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    expect(compiled.effects?.filter((effect) => effect.trigger === "OnDeletion")).toHaveLength(2);
    expect(compiled.effects?.find((effect) => effect.isInherited)).toBeUndefined();
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion" && effect.actions?.[0]?.kind === "PlayWithoutCost")).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, suspended: true, optional: true, target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Purple"] }, count: 1 } }],
    });
  });
});
