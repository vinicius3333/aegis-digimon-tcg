import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-088.js";

describe("BT20-088 Violet Inboots", () => {
  it("gains memory only when the opponent has a Digimon", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
  });

  it("gates the reduced Ghost digivolution on suspending this Tamer", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" } },
              into: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
              reduceCost: 2,
              cost: { kind: "suspend", target: { isSelf: true } },
              abortOnDecline: true,
            },
          ],
        },
      ],
    });
  });
});
