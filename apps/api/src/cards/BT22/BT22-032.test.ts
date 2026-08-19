import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-032.js";

describe("BT22-032 ShoeShoemon", () => {
  it("plays a level-3 Puppet from hand on deletion and applies inherited -2000 DP", () => {
    const onDeletion = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    expect(onDeletion?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levels: [3],
          nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
        },
        count: 1,
      },
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });
});
