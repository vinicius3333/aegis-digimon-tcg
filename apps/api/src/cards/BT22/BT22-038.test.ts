import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-038.js";

describe("BT22-038 Monzaemon", () => {
  it("scales Ver.1-to-Monzaemon digivolution cost and shares the once-per-turn removal/lock reaction", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(replacement?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }] },
      into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Monzaemon"], match: "name" }] },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
    );
    const triggered = compiled.effects.filter(
      (entry) => entry.trigger === "WhenDigivolving" || entry.trigger === "WhenAttacking",
    );
    expect(triggered[0]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "ModifyDP",
          amount: -4000,
          cost: { kind: "trash" },
          also: [{ kind: "Restrict", restriction: "cantActivateWhenDigivolving" }],
        },
      ],
    });
    expect(triggered[1]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "ModifyDP",
          amount: -4000,
          cost: { kind: "trash" },
          also: [{ kind: "Restrict", restriction: "cantActivateWhenDigivolving" }],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited && entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });
});
