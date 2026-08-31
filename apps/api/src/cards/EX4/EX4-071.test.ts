import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
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

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-071");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-071");
});
