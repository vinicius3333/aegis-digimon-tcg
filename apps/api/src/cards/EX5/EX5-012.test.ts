import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-012.js";
import {
  wouldBePlayedSelfReducersFor,
  wouldDigivolveSelfReducersFor,
} from "../../engine/effects/interpreter/registration/reducers.js";

describe("EX5-012 Flaremon", () => {
  it("reduces play and digivolution cost by two only when a qualifying stacked Digimon exists", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldBePlayed",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            mode: "reduceCost",
            amount: 2,
            condition: { kind: "youHave", filter: { digivolutionCardCount: { op: "gte", value: 3 } } },
          },
        ],
      },
      {
        kind: "Replacement",
        event: "wouldDigivolve",
        actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 2 }],
      },
    ]);
  });
  it("registers only self-scoped play and digivolve-into reductions for the pay-time collectors", () => {
    expect(wouldBePlayedSelfReducersFor("EX5-012")).toContainEqual(expect.objectContaining({ amount: 2 }));
    expect(wouldDigivolveSelfReducersFor("EX5-012")).toContainEqual(expect.objectContaining({ amount: 2 }));
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
