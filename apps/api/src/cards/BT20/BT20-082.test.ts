import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-082.js";

describe("BT20-082 DeathXmon", () => {
  it("has Security Attack +1, Reboot, and Blocker", () => {
    expect(compiled.effects.filter((effect) => effect.trigger === "Static").flatMap((effect) => effect.keywords?.map((keyword) => keyword.keyword))).toEqual(["SecurityAttack", "Reboot", "Blocker"]);
  });

  it("prevents effect-caused departure by returning exactly three qualifying trash cards to deck bottom", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [{
        kind: "Replacement",
        event: "wouldLeavePlay",
        sourceFilter: { isSelfRef: true },
        mode: "prevent",
        leaveCause: "byEffect",
        cost: {
          kind: "return",
          position: "bottom",
          target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Dex", "DeathX"], match: "name" }] }, count: 3 },
        },
      }],
    });
  });

  it("deletes all lowest-level Digimon once at the end of all turns", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { kind: ["Digimon"], superlative: "lowestLevel" }, count: "all" } }] });
  });
});
