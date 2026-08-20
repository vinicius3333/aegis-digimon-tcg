import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-060.js";

describe("EX7-060", () => {
  it("plays itself from trash with its cost reduced by 4 when you have four or fewer cards in hand", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: true, reduceCostBy: 4, condition: { kind: "zoneCount", value: 4 } }));
  it("has Blocker and on deletion may play a level 5 or lower Dark Dragon or Evil Dragon from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { count: 1, filter: { levelComparison: { op: "lte", value: 5 } } } });
  });
});
