import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-068.js";

describe("BT20-068 Bakemon", () => {
  it("optionally plays Violet Inboots from hand when there is at most one own Tamer", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", optional: true, from: ["hand"], payCost: false, target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Violet Inboots"], match: "name" }] }, count: 1 }, condition: { kind: "permanentCount", seat: "mine", filter: { kind: ["Tamer"] }, op: "lte", value: 1 } }] });
  });

  it("inherits On Deletion gain 1 memory", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "GainMemory", amount: 1 }] });
  });
});
