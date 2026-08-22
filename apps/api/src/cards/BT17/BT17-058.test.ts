import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-058.js";

describe("BT17-058 GroundLocomon", () => {
  it("reveals three and places one black level-5-or-lower Digimon underneath on both entry timings", () => {
    const effects = compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        add: [{ filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Black"], levelComparison: { op: "lte", value: 5 } }, count: 1, to: "placeUnder" }],
        rest: "trash",
      });
    }
  });

  it("once per turn plays a level-5-or-lower Machine from its digivolution cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfAttack");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Machine"], match: "trait" }] } } }],
    });
  });
});
