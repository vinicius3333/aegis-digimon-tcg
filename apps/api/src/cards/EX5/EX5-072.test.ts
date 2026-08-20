import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-072.js";

describe("EX5-072 Holy Beasts Great Cardinal Positions", () => {
  it("reduces its use cost per unique Deva/Four Sovereigns trash name and can play Fanglongmon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "BeforePayCost")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldBePlayed", actions: [{ kind: "Replacement", mode: "reduceCost", scaling: { per: 1, unit: "cards", filter: { uniqueByName: true, excludeSelf: true } } }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { upTo: true, filter: { nameOrTrait: [{ match: "name", tokens: ["Fanglongmon"] }] } } });
  });
  it("returns Fanglongmon from trash and adds itself from security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([{ kind: "Return", to: "hand" }, { kind: "AddToHandSelf" }]));
});
