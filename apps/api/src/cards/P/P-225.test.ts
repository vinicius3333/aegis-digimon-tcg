import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-225.js";

describe("P-225 DigiLab", () => {
  it("waives color requirements while you have a CS Digimon or Tamer", () => {
    expect(runtimeCompiledCard("P-225")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("draws 1 and places itself in the battle area", () => {
    expect(
      runtimeCompiledCard("P-225")!.effects.find(
        (effect) => effect.trigger === "Main" && effect.actions[0]?.kind === "Draw",
      ),
    ).toMatchObject({ actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }] });
  });

  it("delays a top-stack CS placement cost into 2 memory", () => {
    expect(
      runtimeCompiledCard("P-225")!.effects.find(
        (effect) => effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
      ),
    ).toMatchObject({
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              count: 1,
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "gte", value: 4 },
                nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
              },
            },
          },
        },
      ],
    });
  });

  it("places itself in the battle area from security", () => {
    expect(runtimeCompiledCard("P-225")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
    });
  });
});
