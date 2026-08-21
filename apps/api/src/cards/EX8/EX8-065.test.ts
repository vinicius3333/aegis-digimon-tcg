import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-065.js";

describe("EX8-065", () => {
  it("gains 1 memory at the start of the main phase when the opponent has a Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    }));
  it("may digivolve a Tyrannomon or Dinosaur attacker from hand by suspending this Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true, cost: { kind: "suspend" } }],
    });
  });
  it("plays itself without paying the cost when revealed in security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    }));
});
