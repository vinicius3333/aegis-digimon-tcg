import { describe, expect, it } from "vitest";
import { compiled as snatchmon } from "./BT18-065.js";
import { compiled as velgrmon } from "./BT18-079.js";

describe("BT18 Vemmon/Velgrmon inherited and scaling clauses", () => {
  it("reacts only when a Vemmon leaves this stack for the bottom of the deck", () => {
    const inherited = snatchmon.effects?.[3];
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardReturnToDeckBottom",
          sourceFilter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] },
          actions: [{ kind: "Unsuspend" }, { kind: "GainKeyword", keyword: { keyword: "Blocker" } }],
        },
      ],
    });
  });

  it("scales Velgrmon's DP by the cards trashed by this effect", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = velgrmon.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "TrashTopDeck", trackCount: "trashedThisEffect" });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        scaling: { unit: "namedCount", countSource: "trashedThisEffect" },
      });
    }
  });
});
