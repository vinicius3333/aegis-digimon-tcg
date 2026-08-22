import { describe, expect, it } from "vitest";
import { appFusionCostFor, assemblyRequirementFor } from "@aegis/shared";
import { compiled } from "./BT26-028.js";

describe("BT26-028 Medicmon", () => {
  it("preserves App Fusion, Assembly, link windows, and linked-face behavior", () => {
    expect(appFusionCostFor("BT26-028", { topName: "Aidmon", linkedNames: ["Supplemon"] })).toBe(0);
    expect(assemblyRequirementFor("BT26-028")).toEqual([{ reduceCost: 2, materials: [{ traits: ["Life", "System", "Seven Code"], level: 3, count: 1 }] }]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2 }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", keywords: expect.arrayContaining([
        { keyword: "Barrier", raw: "＜Barrier＞" },
        { keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" },
      ]) }),
      expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "Link", from: ["digivolutionCards"], payCost: false, optional: true })] }),
      expect.objectContaining({ trigger: "WhenDigivolving" }),
      expect.objectContaining({ trigger: "Static", isLinked: true, actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: expect.arrayContaining([
        expect.objectContaining({ kind: "Restrict", restriction: "cannotActivateWhenDigivolving", duration: "untilOpponentTurnEnd" }),
        expect.objectContaining({ kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd" }),
      ]) }] }),
    ]));
  });
});
