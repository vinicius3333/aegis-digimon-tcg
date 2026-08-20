import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-058.js";

describe("EX5-058 Zhuqiaomon", () => {
  it("creates or gives an opponent a suspended Fujitsumon token based on the four-Digimon threshold", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Modal", choose: 1, options: [[{ kind: "PlayWithoutCost", suspend: true, controller: "self" }], [{ kind: "PlayToken", to: "opponentBattleArea", suspend: true, asOpponentDigimon: true }]], condition: { operator: ">=", value: 4 }, elseCondition: { operator: "<=", value: 3 } });
    }
  });
  it("inherits once-per-turn memory when an opponent plays a Digimon by effect", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", sourceFilter: { byEffect: true }, actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });
});
