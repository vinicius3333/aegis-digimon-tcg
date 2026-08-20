import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-066.js";

describe("BT14-066", () => {
  it("gains two memory on play or digivolution by trashing a Numemon from hand", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 2, cost: { kind: "trash", target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["Numemon"], match: "name" }] } } } });
  });
  it("plays a level-five-or-lower Numemon or Monzaemon from hand on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, target: { filter: { levelComparison: { op: "lte", value: 5 } } } }));
});
