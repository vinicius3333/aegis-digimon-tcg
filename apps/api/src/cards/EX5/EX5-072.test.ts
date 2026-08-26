import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-072.js";
import { wouldBePlayedSelfReducersFor } from "../../engine/effects/interpreter/registration/reducers.js";

describe("EX5-072 Holy Beasts Great Cardinal Positions", () => {
  it("queues the paid Option reduction once per distinct qualifying trash name", () => {
    const reduction = compiled.effects?.find((entry) => entry.trigger === "BeforePayCost")?.actions?.[0];
    expect(reduction).toMatchObject({
      kind: "Replacement",
      actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 1 }],
    });
    expect(wouldBePlayedSelfReducersFor("EX5-072")).toContainEqual(expect.objectContaining({ amount: 1 }));
  });
  it("reduces its use cost per unique Deva/Four Sovereigns trash name and can play Fanglongmon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "BeforePayCost")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          scaling: {
            per: 1,
            unit: "cards",
            filter: {
              controller: "mine",
              zone: "trash",
              uniqueByName: true,
              excludeSelf: true,
              nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Sovereigns"] }],
            },
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        count: 1,
        upTo: true,
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Fanglongmon"] }] },
      },
    });
  });
  it("returns a Fanglongmon Digimon from trash and adds itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      {
        kind: "Return",
        to: "hand",
        target: {
          count: 1,
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Fanglongmon"] }],
          },
        },
      },
      { kind: "AddToHandSelf" },
    ]));
});
