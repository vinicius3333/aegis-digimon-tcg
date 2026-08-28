import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-057.js";

describe("EX5-057 Labramon", () => {
  it("returns a Dark Animal or Shaman from trash by trashing one card from hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      abortOnDecline: true,
      target: {
        count: 1,
        filter: {
          zone: "trash",
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Dark Animal", "Shaman"] }],
        },
      },
      cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
    });
  });
  it("inherits once-per-turn memory when you play a Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], byEffect: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });
});
