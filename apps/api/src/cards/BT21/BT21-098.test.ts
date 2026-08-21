import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-098.js";

describe("BT21-098 Ragnarok Cannon", () => {
  it("keeps Main deletion, Galacticmon Delay payload, and Security Vemmon play separate", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestPlayCost" } },
    });
    expect(main?.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });

    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Galacticmon"], match: "name" }] },
    });
    const nested = (yourTurn?.actions[0] as any).actions;
    expect(nested).toHaveLength(2);
    expect(nested[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestPlayCost" } },
    });
    expect(nested[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      leaveCount: 1,
      condition: { kind: "ifThisEffectDidNotDelete" },
    });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["hand", "trash"],
      target: { filter: { playCostLte: 6 } },
    });
    expect(security?.actions[1]).toEqual({ kind: "AddToHandSelf" });
  });
});
