import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-038.js";

describe("EX4-038 Agumon", () => {
  it("reveals three, adds Greymon and Gabumon/Garurumon/Omnimon, and returns the rest to deck top", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckTop",
      add: [
        { filter: { nameOrTrait: [{ match: "name", tokens: ["Greymon"] }] } },
        { filter: { nameOrTrait: [{ match: "name", tokens: ["Gabumon", "Garurumon", "Omnimon"] }] } },
      ],
    });
  });
  it("gains memory once per turn when one of your Digimon digivolves", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-038");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-038");
});
