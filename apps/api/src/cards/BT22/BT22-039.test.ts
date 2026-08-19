import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-039.js";

describe("BT22-039 Ouranosmon", () => {
  it("keeps Alliance/Link +1, shared once-per-turn play effects, and links an Appmon from this stack to an owned Digimon", () => {
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Entermon", "Fakemon"], cost: 0 }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Link", amount: 1, raw: "＜Link +1＞" }] }),
    );
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
      });
    }
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [
        {
          kind: "Link",
          source: {
            from: ["digivolutionCards"],
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          },
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          payCost: false,
          optional: true,
        },
      ],
    });
  });
});
