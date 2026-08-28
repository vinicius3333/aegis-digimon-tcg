import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-071.js";

describe("EX4-071 Ame-no-Ohabari", () => {
  it("deletes an opposing Digimon at or below the level of the own Digimon sacrificed", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "Delete",
      cost: { kind: "deleteOwn", bindResultAs: "deleted" },
      target: { filter: { controller: "opponent", levelComparison: { op: "lte", relativeTo: "lastDeleted" } } },
    });
  });
  it("plays Ravemon from trash at opponent turn end when the sacrificed card was Ravemon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1]).toMatchObject({
      kind: "SubTrigger",
      event: "endOfOpponentTurn",
      condition: { kind: "bindingContains", ref: "deleted" },
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { location: "trash", controller: "mine" } }],
    });
  });
});
