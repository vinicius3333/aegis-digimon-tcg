import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-070.js";

describe("BT23-070 Belphemon (X Antibody)", () => {
  it("declares Rush and Piercing", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword)),
    ).toEqual(["Rush", "Piercing"]);
  });

  it("deletes all opposing highest-level Digimon and attacks without suspending when Belphemon is in its stack", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions;
    expect(actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "highestLevel" }, count: "all" },
    });
    expect(actions[1]).toMatchObject({
      kind: "Restrict",
      restriction: "attacks without suspending",
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
    expect(actions[2]).toMatchObject({
      kind: "Attack",
      withoutSuspending: true,
      mandatory: true,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });

  it("can digivolve into Belphemon: Sleep Mode from trash after attacking", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "EndOfAttack") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: false,
      ignoreRequirements: true,
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Belphemon: Sleep Mode"], match: "name" }] },
    });
  });

  it("requires a level 6 Belphemon without the X Antibody trait for the alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, names: ["Belphemon"], excludeTraits: ["X Antibody"], cost: 2, isAlternate: true },
    ]);
  });
});
