import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-002.js";

describe("EX4-002 Kokomon", () => {
  it("draws once per turn when an effect suspends one of your Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenEffectSuspends", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }] });
  });
});
