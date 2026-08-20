import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-041.js";

describe("EX9-041", () => {
  it("has Fortitude and reduces Ver.5 digivolution by one per digivolution card", () => {
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Fortitude"))?.keywords).toContainEqual({ keyword: "Fortitude", raw: "＜Fortitude＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.actions.length > 0)).toMatchObject({ actions: [{ actions: [{ mode: "reduceCost", amount: 1, scaling: { unit: "digivolutionCards", per: 1 } }] }] });
  });
  it("suspends and may return the lowest-DP suspended opponent Digimon by trashing its bottom face-down card", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "Suspend" }, { kind: "Return", to: "hand", cost: { kind: "trash" }, target: { filter: { suspended: true, superlative: "lowestDP" } } }] }));
  it("inherits security trash when an opponent Digimon is deleted in battle", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }] }] }));
});
