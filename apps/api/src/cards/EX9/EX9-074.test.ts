import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-074.js";

describe("EX9-074", () => {
  it("has Rush and Security A. +1", () => expect(compiled.effects?.flatMap((entry) => entry.keywords)).toEqual(expect.arrayContaining([{ keyword: "Rush", raw: "＜Rush＞" }, { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" }])));
  it("places an optional level-four-or-lower DM Digimon from trash and deletes a color-matching opponent Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "PlaceUnder", position: "top", optional: true }, { kind: "Delete", condition: { kind: "not" }, target: { filter: { colorMatchesAnyDigivolutionCard: true } } }, { kind: "DeletePerColor", condition: { kind: "selfDigivolutionStackDistinctColorCount" } }] });
  });
});
