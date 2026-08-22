import { describe, expect, it } from "vitest";
import { appFusionCostFor, assemblyRequirementFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-028.js";
import "../index.js";

describe("BT26-028 Medicmon", () => {
  it("preserves App Fusion, Assembly, link windows, and linked-face behavior", () => {
    expect(appFusionCostFor("BT26-028", { topName: "Aidmon", linkedNames: ["Supplemon"] })).toBe(0);
    expect(assemblyRequirementFor("BT26-028")).toEqual([
      { reduceCost: 2, materials: [{ traits: ["Life", "System", "Seven Code"], level: 3, count: 1 }] },
    ]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Aidmon", "Supplemon", "Spamon"], cost: 0 }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([
            { keyword: "Barrier", raw: "＜Barrier＞" },
            { keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" },
          ]),
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({ kind: "Link", from: ["digivolutionCards"], payCost: false, optional: true }),
          ],
        }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
        expect.objectContaining({
          trigger: "Static",
          isLinked: true,
          actions: [
            {
              kind: "SubTrigger",
              event: "whenLinked",
              sourceFilter: { isSelfRef: true },
              actions: [
                expect.objectContaining({
                  kind: "SelectBind",
                  target: expect.objectContaining({ bindAs: "medicmonLinkedTarget" }),
                }),
                expect.objectContaining({
                  kind: "Restrict",
                  target: { fromSelectionRef: "medicmonLinkedTarget" },
                  restriction: "cannotActivateWhenDigivolving",
                  duration: "untilOpponentTurnEnd",
                }),
                expect.objectContaining({
                  kind: "ModifyDP",
                  target: { fromSelectionRef: "medicmonLinkedTarget" },
                  amount: -3000,
                  duration: "untilOpponentTurnEnd",
                }),
              ],
            },
          ],
        }),
      ]),
    );
  });

  it("links a legal level-3 Link source and affects exactly one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-028", as: "medicmon", under: ["BT26-084"] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 7000 },
            { card: "BT1-010", as: "second", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("medicmon"));

    expect(s.perm("medicmon").linked.map((card) => card.cardId)).toEqual(["BT26-084"]);
    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("first"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("when digivolving links a legal source from the evolved stack and applies both debuffs together", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-025", as: "base", under: [{ card: "BT26-084", as: "linkSource" }] }],
          hand: [{ card: "BT26-028", as: "medicmon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("medicmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));

    expect(s.perm("base").topCard.cardId).toBe("BT26-028");
    expect(s.perm("base").linked.map((card) => card.instanceId)).toContain(s.inst("linkSource").instanceId);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("publishes Barrier and Detach while Medicmon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-028", as: "medicmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("medicmon"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("medicmon"), "Detach")).toBe(true);
  });
});
