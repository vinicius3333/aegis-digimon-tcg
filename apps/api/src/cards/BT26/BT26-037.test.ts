import { describe, expect, it } from "vitest";
import { appFusionCostFor, assemblyRequirementFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-037.js";

describe("BT26-037 Weatherdramon", () => {
  it("models App Fusion, Assembly, link windows, Blocker/Detach, and linked battle", () => {
    expect(appFusionCostFor("BT26-037", { topName: "Weathermon", linkedNames: ["Rocketmon"] })).toBe(0);
    expect(assemblyRequirementFor("BT26-037")).toEqual([
      { reduceCost: 2, materials: [{ traits: ["Navi", "System", "Seven Code"], level: 3, count: 1 }] },
    ]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Weathermon", "Rocketmon", "Newsmon"], cost: 0 }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([
            { keyword: "Blocker", raw: "＜Blocker＞" },
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
          actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "Battle", optional: true }] }],
        }),
      ]),
    );
  });

  it("links a legal source and initiates the linked-face battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-037", as: "weatherdramon", under: ["BT26-084"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("weatherdramon"));

    expect(s.perm("weatherdramon").linked.map((card) => card.cardId)).toEqual(["BT26-084"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
