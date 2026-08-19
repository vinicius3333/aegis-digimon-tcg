import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-052.js";

describe("BT22-052 Leopardmon", () => {
  it("plays a small Digimon and grants Blocker to all level 3+ Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        optional: true,
        target: { filter: { controller: "mine", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 3 } },
          count: "all",
        },
      });
    }
  });

  it("gains 2 memory when another own Digimon would leave, once per turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [{ kind: "GainMemory", amount: 2 }],
        },
      ],
    });
  });
});
