import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-029.js";

describe("BT23-029 Antylamon", () => {
  it("declares Alliance", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
  });

  it("once per turn reacts to any played Beast, Beastkin, or CS card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        nameOrTrait: [{ tokens: ["Beast", "Beastkin", "CS"], match: "trait" }],
      },
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
