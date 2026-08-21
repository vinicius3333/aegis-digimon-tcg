import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-180.js";

describe("P-180 Bind Red Trigger", () => {
  it("deletes an opponent Digimon at 7000 DP or less when this card is trashed from a stack", () => {
    expect(runtimeCompiledCard("P-180")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [{ event: "onDigivolutionCardDiscarded", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Delete", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } } } }] }],
    });
  });

  it("waives its color requirement while you have a Three Musketeers Digimon", () => {
    expect(runtimeCompiledCard("P-180")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }] } } }],
    });
  });

  it("trashes the opponent's top security card and places itself under a Three Musketeers Digimon", () => {
    expect(runtimeCompiledCard("P-180")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "SecurityManipulation", op: "trash", controller: "opponent", amount: 1, toTop: true },
        { kind: "PlaceUnder", position: "bottom", underFilter: { nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }] } },
      ],
    });
  });

  it("deletes the opponent's highest-DP Digimon in Security", () => {
    expect(runtimeCompiledCard("P-180")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "Delete", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" } } }],
    });
  });
});
