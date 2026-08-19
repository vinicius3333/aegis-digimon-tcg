import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-031.js";

describe("BT22-031 GoldNumemon", () => {
  it("applies Security Attack -2 and gates the PlatinumNumemon option on same-level stack cards", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "GainKeyword",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        keyword: { keyword: "SecurityAttack", amount: -2 },
        duration: "untilOpponentTurnEnd",
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Digivolve",
        into: { nameOrTrait: [{ tokens: ["PlatinumNumemon"], match: "name" }] },
        from: ["hand"],
        costOverride: 4,
        ignoreRequirements: true,
        optional: true,
        condition: { kind: "stackHasSameLevelCards", count: 2 },
      });
    }
    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });
});
