import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-039.js";

describe("BT17-039 ShineGreymon", () => {
  it("may play Marcus Damon from hand when digivolving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] }, count: 1 } });
  });

  it("once per turn prevents opponent-effect removal by returning a yellow Tamer", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "byOpponentEffect", actions: [{ kind: "Prevent", cost: { kind: "return", target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 } } }] }] });
  });
});
