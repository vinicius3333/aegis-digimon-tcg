import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled as gigaBlaster } from "./BT1-111.js";
import { compiled as dimensionScissor } from "./BT1-112.js";
import { compiled as forbiddenTemptation } from "./BT1-113.js";
import { compiled as metalGreymon } from "./BT1-114.js";
import { compiled as veedramon } from "./BT1-115.js";

describe("BT1-111 through BT1-115 IR coverage", () => {
  it("registers every range module with complete IR", () => {
    for (const card of [gigaBlaster, dimensionScissor, forbiddenTemptation, metalGreymon, veedramon]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("retains each printed clause, target scope, duration, and limit", () => {
    expect(irNode(gigaBlaster.effects[0]?.actions[0])).toMatchObject({
      kind: "ConditionalBranch",
      condition: {
        kind: "opponentHas",
        countMin: 2,
        filter: { kind: ["Digimon"], dp: { op: "lte", value: 5000 } },
      },
      ifTrue: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [{ kind: "Suspend", target: { count: 1 } }],
            [{ kind: "Suspend", target: { count: 2, filter: { dp: { op: "lte", value: 5000 } } } }],
          ],
        },
      ],
      ifFalse: [{ kind: "Suspend", target: { count: 1 } }],
    });
    expect(dimensionScissor.effects[0]?.actions[0]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "whenDeletesInBattle",
      duration: "forTheTurn",
      gainedActions: [{ kind: "Unsuspend", target: { isSelf: true } }],
    });
    expect(dimensionScissor.effects[1]?.actions).toEqual([{ kind: "AddToHandSelf" }]);
    expect(forbiddenTemptation.effects[0]?.actions).toMatchObject([
      { kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd" },
      { kind: "Restrict", restriction: "block", target: { sameTarget: true }, duration: "untilOpponentTurnEnd" },
    ]);
    expect(forbiddenTemptation.effects[1]?.actions).toMatchObject([
      { kind: "Restrict", restriction: "unsuspend", target: { count: "all" }, duration: "untilOpponentTurnEnd" },
    ]);
    expect(metalGreymon.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 2 }],
    });
    expect(metalGreymon.effects[1]?.actions).toEqual([{ kind: "GainMemory", amount: -5 }]);
    expect(metalGreymon.effects[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 3000, duration: "forTheTurn" }],
    });
    expect(veedramon.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", condition: { kind: "youHave", filter: { kind: ["Tamer"] } } }],
    });
    expect(veedramon.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "forTheTurn",
          condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Blue"] } },
        },
      ],
    });
  });
});
