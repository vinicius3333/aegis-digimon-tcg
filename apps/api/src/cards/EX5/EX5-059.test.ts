import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-059.js";

describe("EX5-059 Dobermon (X Antibody)", () => {
  it("grants Retaliation to one of your Digimon until the opponent's turn ends", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Retaliation" },
      duration: "untilOpponentTurnEnd",
      target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
    });
  });
  it("draws and trashes on digivolving, then reactivates its On Play effect for Dobermon/X Antibody", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      {
        kind: "ReactivateEffect",
        fromTrigger: "OnPlay",
        count: 1,
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { match: "name", tokens: ["Dobermon"] },
              { match: "trait", tokens: ["X Antibody"] },
            ],
          },
        },
      },
    ]);
  });
  it("inherits once-per-turn memory when an effect plays your Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], byEffect: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });
});
