import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-039.js";

describe("EX4-039 Gabumon", () => {
  it("reveals three, adds Garurumon and Agumon/Greymon/Omnimon, and returns the rest to deck top", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTop", add: [{ filter: { nameOrTrait: [{ match: "name", tokens: ["Garurumon"] }] } }, { filter: { nameOrTrait: [{ match: "name", tokens: ["Agumon", "Greymon"] }, { match: "name", tokens: ["Omnimon"] }] } }] });
  });
  it("gains memory once per turn when one of your Digimon digivolves", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });
});
