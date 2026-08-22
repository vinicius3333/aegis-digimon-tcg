import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-219.js";

describe("P-219 Flame Inferno", () => {
  it("reduces its use cost by 3 only while the opponent has at least 10 trash cards", () => {
    expect(runtimeCompiledCard("P-219")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "CostModifier",
          costType: "use",
          mode: "reduce",
          amount: 3,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
        },
      ],
    });
  });

  it("deletes a level 6 or lower opponent Digimon, then optionally plays Creepymon for the deletion cost", () => {
    expect(runtimeCompiledCard("P-219")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
          },
        },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          target: { count: 1, filter: { controller: "mine", nameOrTrait: [{ tokens: ["Creepymon"], match: "name" }] } },
        },
        { kind: "GainKeyword", keyword: { keyword: "Rush", raw: "＜Rush＞" }, target: { count: 1, sameTarget: true } },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          target: { count: 1, sameTarget: true },
        },
      ],
    });
  });

  it("activates its Main effects from security", () => {
    expect(runtimeCompiledCard("P-219")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });
});
