import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-205.js";

describe("P-205 Insane Synthetic Monster", () => {
  it("waives its color requirement only while you have a DM Digimon or Tamer", () => {
    expect(runtimeCompiledCard("P-205")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      condition: {
        kind: "youHave",
        filter: { controller: "mine", kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] },
      },
      actions: [{ kind: "WaiveColorRequirement", target: { isSelf: true } }],
    });
  });

  it("draws, trashes two, and places itself for Main and Security", () => {
    const card = runtimeCompiledCard("P-205")!;
    for (const effect of card.effects.filter(
      (entry) => (entry.trigger === "Main" && !entry.keywords?.length) || entry.trigger === "Security",
    )) {
      expect(effect.actions).toEqual([
        { kind: "Draw", controller: "mine", amount: 2 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
        { kind: "PlaceInBattleAreaSelf" },
      ]);
    }
  });

  it("deletes your low-cost Digimon and plays a named card from your trash with cost reduced by 3", () => {
    expect(
      runtimeCompiledCard("P-205")!.effects.find((effect) =>
        effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
      ),
    ).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        { kind: "Delete", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], playCostLte: 7 } } },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 3,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Kimeramon", "Millenniummon"], match: "name" }],
            },
          },
        },
      ],
    });
  });
});
