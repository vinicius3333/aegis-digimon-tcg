import { describe, expect, it } from "vitest";
import { appFusionCostFor, assemblyRequirementFor } from "@aegis/shared";
import { compiled } from "./BT26-037.js";

describe("BT26-037 Weatherdramon", () => {
  it("models App Fusion, Assembly, link windows, Blocker/Detach, and linked battle", () => {
    expect(appFusionCostFor("BT26-037", { topName: "Weathermon", linkedNames: ["Rocketmon"] })).toBe(0);
    expect(assemblyRequirementFor("BT26-037")).toEqual([{ reduceCost: 2, materials: [{ traits: ["Navi", "System", "Seven Code"], level: 3, count: 1 }] }]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2 }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", keywords: expect.arrayContaining([{ keyword: "Blocker", raw: "＜Blocker＞" }, { keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }]) }),
      expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "Link", from: ["digivolutionCards"], payCost: false, optional: true })] }),
      expect.objectContaining({ trigger: "WhenDigivolving" }),
      expect.objectContaining({ trigger: "Static", isLinked: true, actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "Battle", optional: true }] }] }),
    ]));
  });
});
