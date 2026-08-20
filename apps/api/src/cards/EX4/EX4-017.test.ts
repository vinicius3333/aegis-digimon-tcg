import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-017.js";

describe("EX4-017 Gaogamon", () => {
  it("returns an opposing level 3 Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 } });
  });
  it("gains memory once per turn when an effect adds to the opponent's hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });
});
