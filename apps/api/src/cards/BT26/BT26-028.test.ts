import { describe, expect, it } from "vitest";
import { appFusionCostFor, assemblyRequirementFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-028.js";
import "../index.js";

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

  it("links a legal level-3 Link source and affects exactly one opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-028", as: "medicmon", under: ["BT26-084"] }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 7000 },
          { card: "BT1-010", as: "second", dp: 7000 },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked.map((card) => card.cardId)).toEqual(["BT26-084"]);
    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "cannotActivateWhenDigivolving")).toBe(false);
  });
});
