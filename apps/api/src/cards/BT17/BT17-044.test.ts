import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-044.js";

describe("BT17-044 Morphomon", () => {
  it("reduces its own Eosmon digivolution by one during your turn", () => {
    expect(
      compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
      into: { nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
  });

  it("once per turn may evolve into Eosmon for three less when another Eosmon is played", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            excludeSelf: true,
            nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }],
          },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              reduceCost: 3,
              optional: true,
              into: { nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
            },
          ],
        },
      ],
    });
  });
});
