import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-068.js";

describe("EX5-068 Flashy Boss Punch", () => {
  it("waives color requirements with Leomon/Bancho present and suspends then weakens an opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "name", tokens: ["Leomon", "Bancho"] }],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Suspend", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
      {
        kind: "ModifyDP",
        amount: -12000,
        duration: "forTheTurn",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      },
      {
        kind: "Attack",
        optional: true,
        target: {
          count: 1,
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Leomon", "Bancho"] }],
          },
        },
        withoutSuspending: false,
      },
    ]);
  });
  it("has the same suspend and DP reduction in security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "Suspend", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
      {
        kind: "ModifyDP",
        amount: -12000,
        duration: "forTheTurn",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      },
    ]));
});
