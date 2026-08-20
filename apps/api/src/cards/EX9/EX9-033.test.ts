import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-033.js";

describe("EX9-033", () => {
  it("gives own Puppet Digimon Alliance and Blocker", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns" && entry.actions.some((action) => action.kind === "GainKeyword"))).toMatchObject({ actions: [{ kind: "GainKeyword", keyword: { keyword: "Alliance" } }, { kind: "GainKeyword", keyword: { keyword: "Blocker" } }] }));
  it("once per turn plays a level 4-or-lower Puppet from trash at end of turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { levelComparison: { op: "lte", value: 4 } } } }] }));
});
