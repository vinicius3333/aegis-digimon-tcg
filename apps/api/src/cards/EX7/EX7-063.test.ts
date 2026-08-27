import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-063.js";

describe("EX7-063", () => {
  it("gains 1 memory when the opponent has a Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    }));
  it("plays a level 3 Puppet from hand by suspending itself when one of your Puppet Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { allowTokens: true },
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, target: { count: 1 } }],
    }));
  it("plays itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    }));
});
