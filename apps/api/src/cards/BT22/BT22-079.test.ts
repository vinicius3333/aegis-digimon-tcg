import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-079.js";

describe("BT22-079 Eater (Species Form)", () => {
  it("has Blocker and draws one card on play", () => {
    const blocker = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(blocker?.keywords).toEqual([{ keyword: "Blocker", raw: "＜Blocker＞" }]);

    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions).toEqual([]);
    expect(onPlay?.keywords).toEqual([{ keyword: "Draw", amount: 1, raw: "＜Draw 1＞" }]);
  });

  it("reduces an owned Eater Digimon's play cost only during your turn in breeding", () => {
    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(inherited).toMatchObject({
      isInherited: true,
      isBreeding: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Eater"], match: "trait" }],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 1,
              optional: true,
            },
          ],
        },
      ],
    });
  });
});
