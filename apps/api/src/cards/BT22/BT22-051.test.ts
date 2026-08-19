import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-051.js";

describe("BT22-051 Okuwamon", () => {
  it("returns the lowest-DP suspended opponent Digimon only with a same-level stack pair", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Return",
        to: "hand",
        target: {
          filter: { controller: "opponent", suspended: true, kind: ["Digimon"], superlative: "lowestDP" },
          count: 1,
        },
        condition: { kind: "stackHasSameLevelCards", count: 2 },
      });
    }
  });

  it("anchors the inherited security trash watcher to this Digimon's battle deletion", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });
});
