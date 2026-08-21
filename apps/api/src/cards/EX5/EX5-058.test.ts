import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-058.js";

describe("EX5-058 Octomon", () => {
  it("creates or gives an opponent a suspended Fujitsumon token based on the four-Digimon threshold", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        options: [
          [
            {
              kind: "PlayWithoutCost",
              payCost: false,
              suspend: true,
              controller: "self",
              target: { count: 1, filter: { name: "Fujitsumon", isToken: true } },
            },
          ],
          [
            {
              kind: "PlayToken",
              to: "opponentBattleArea",
              suspend: true,
              controller: "self",
              asOpponentDigimon: true,
              target: { count: 1, filter: { name: "Fujitsumon", isToken: true } },
            },
          ],
        ],
        condition: {
          operator: ">=",
          value: 4,
          count: {
            kind: "count",
            controller: "both",
            filter: { type: "Digimon", zone: ["battleArea"], includeTokens: true },
          },
        },
        elseCondition: {
          operator: "<=",
          value: 3,
          count: {
            kind: "count",
            controller: "both",
            filter: { type: "Digimon", zone: ["battleArea"], includeTokens: true },
          },
        },
      });
    }
  });
  it("inherits once-per-turn memory when an opponent plays a Digimon by effect", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", sourceFilter: { byEffect: true }, actions: [{ kind: "GainMemory", amount: 1 }] }],
    });
  });
});
