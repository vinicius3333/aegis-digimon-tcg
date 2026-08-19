import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-033.js";

describe("BT23-033 Beautymon", () => {
  it("declares Barrier", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("may link a level 4-or-lower card from trash or this Digimon's stack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Link",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
        from: ["trash", "digivolutionCards"],
        payCost: false,
        optional: true,
      });
      expect(action.recipient).toBeUndefined();
    }
  });

  it("once per turn reacts only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 5 },
        },
      ],
    });
    expect(effect.actions[1]).toMatchObject({
      kind: "ModifyDP",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      amount: -1000,
      duration: "untilOpponentTurnEnd",
      scaling: { per: 1, unit: "security", filter: { controller: "mine" } },
    });
  });
});
