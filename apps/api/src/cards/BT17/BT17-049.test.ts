import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-049.js";

describe("BT17-049 Antylamon", () => {
  it("has Alliance and plays one level-3 green or yellow Digimon from trash when digivolving", () => {
    expect(compiled.effects.some((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Alliance"))).toBe(true);
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow", "Green"], levels: [3] }, count: 1 } });
  });

  it("once per turn deletes another suspended Digimon to play a level-3 Beast from trash", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "EndOfAttack", frequency: "OncePerTurn", actions: [{ kind: "PlayWithoutCost", from: ["trash"], target: { filter: { controller: "mine", levels: [3], nameOrTrait: [{ tokens: ["Beast"], match: "trait" }] } }, cost: { kind: "deleteOwn", target: { filter: { controller: "mine", excludeSelf: true, suspended: true, kind: ["Digimon"] }, count: 1 } } }] });
  });
});
