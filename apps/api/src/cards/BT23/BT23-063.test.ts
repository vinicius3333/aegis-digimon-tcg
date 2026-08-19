import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-063.js";

describe("BT23-063 Sangloupmon", () => {
  it("may digivolve itself into an Undead or CS Digimon from trash while attacking", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited) as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, isSelf: true },
      into: { nameOrTrait: [{ tokens: ["Undead", "CS"], match: "trait" }] },
      from: ["trash"],
      optional: true,
    });
  });

  it("has the inherited once-per-turn trash digivolution into Undead or Dark Animal", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking" && entry.isInherited) as any;
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          optional: true,
          target: { filter: { controller: "mine", kind: ["Digimon"] } },
          into: { nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] },
        },
      ],
    });
  });

  it("requires a level 3 CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["CS"], cost: 2, isAlternate: true }]);
  });
});
