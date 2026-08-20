import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-071.js";

describe("EX9-071", () => {
  it("waives color requirements with a DM card and draws before entering the battle area", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ kind: "WaiveColorRequirement", condition: { kind: "anyOf" } }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toEqual([{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]);
  });
  it("has Delay to unsuspend a selected DM Digimon by trashing its bottom two face-down cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main" && entry.keywords?.some((keyword) => keyword.keyword === "Delay"))).toMatchObject({ actions: [{ kind: "Unsuspend", cost: { kind: "trash", target: { count: 2 } } }] }));
  it("gains memory and enters the battle area from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "GainMemory", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }] }));
});
