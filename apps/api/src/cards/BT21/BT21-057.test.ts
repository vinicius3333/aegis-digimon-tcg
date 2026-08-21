import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-057.js";

describe("BT21-057 Greymon", () => {
  it("preserves both alternate Digivolution requirements and complete coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Agumon"], cost: 2, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 2, isAlternate: true, level: 3 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("grants the opponent's Digimon the printed conditional start-of-main attack", () => {
    const triggers = compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));

    expect(triggers).toHaveLength(2);
    for (const effect of triggers) {
      expect(effect.actions[0]).toMatchObject({
        kind: "GrantStatic",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        grant: "tokenEffect",
        tokens: ["GRANTEFFECT23TOKEN"],
        duration: "untilOpponentTurnEnd",
        condition: {
          kind: "youHave",
          filter: {
            controllerDefault: "mine",
            kind: ["Tamer"],
            nameOrTrait: [
              { tokens: ["Tai Kamiya"], match: "name" },
              { tokens: ["ADVENTURE"], match: "trait" },
            ],
          },
        },
      });
    }
    expect(compiled.effects).toContainEqual({
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
    });
  });
});
