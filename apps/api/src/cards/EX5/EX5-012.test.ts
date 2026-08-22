import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-012.js";

describe("EX5-012 Flaremon", () => {
  it("reduces play and digivolution cost by two only when a qualifying stacked Digimon exists", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldBePlayed",
        actions: [
          {
            kind: "CostModifier",
            amount: 2,
            condition: { kind: "youHave", filter: { digivolutionCardCount: { op: "gte", value: 3 } } },
          },
        ],
      },
      { kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 2 },
    ]);
  });
  it("deletes an opposing Digimon at 5000 DP or less on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 5000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 5000 } } },
    });
  });
  it("grants itself 2000 DP during its controller's turn when inherited", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true } } }],
    });
  });
});
