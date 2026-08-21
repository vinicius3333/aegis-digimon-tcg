import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-099.js";

describe("BT18-099 Fist of Athena", () => {
  it("covers the Knightmon color waiver, opponent attack grant, and battle-area placement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] } } }] });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "GrantAuraToOpponents", duration: "untilOpponentTurnEnd", effectText: "[Start of Your Main Phase] This Digimon attacks." },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("implements the errata duration and Q3051 Delay trigger", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }] },
        { kind: "GainKeyword", keyword: { keyword: "Piercing" }, duration: "untilYourTurnEnd" },
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "untilYourTurnEnd" },
      ],
    });
    expect(compiled.effects[3]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["trash"], optional: true, target: { filter: { levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] } } }, { kind: "PlaceInBattleAreaSelf", optional: true }] });
  });
});
