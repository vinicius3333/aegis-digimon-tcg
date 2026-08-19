import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-011.js";

describe("BT22-011 BlueMeramon", () => {
  it("gates the once-per-turn Flame play and follow-up attack behind paying 3 memory", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "payMemory", memory: 3 },
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          playCostLte: 5,
          nameOrTrait: [{ tokens: ["Flame"], match: "trait" }],
        },
      },
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "Attack",
      target: { filter: { isSelfRef: true }, isSelf: true },
      optional: true,
    });

    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(inherited).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Alliance" },
          duration: "permanent",
          target: { filter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Flame", "CS"], match: "trait" }] } },
        },
      ],
    });
  });
});
