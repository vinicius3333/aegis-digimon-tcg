import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-036.js";

describe("EX8-036", () => {
  it("plays an NSo Digimon costing 5 or less from hand or trash when digivolving", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true, target: { count: 1, filter: { playCostLte: 5 } } }));
  it("has Recovery +1 (Deck) on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.keywords).toContainEqual({ keyword: "Recovery", amount: 1, raw: "＜Recovery +1 (Deck)＞" }));
});
