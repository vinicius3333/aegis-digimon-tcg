import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-070.js";

describe("EX4-070 Tarnished Hero", () => {
  it("deletes an opposing level three Digimon and places itself in the battle area", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "Delete", target: { filter: { controller: "opponent", levels: [3] } } }, { kind: "PlaceInBattleAreaSelf" }]);
  });
  it("has Delay and makes the opponent choose between trashing an Option and its controller gaining memory", () => {
    const delay = compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay?.actions).toMatchObject([{ kind: "Trash", controller: "opponent", target: { filter: { zone: "hand", kind: ["Option"] } } }, { kind: "GainMemory", amount: 2, condition: { kind: "ifThisEffectDidNotAct" } }]);
  });
});
