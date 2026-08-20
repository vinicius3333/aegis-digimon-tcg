import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-007.js";

describe("LM-007 Publimon", () => {
  it("plays from Security without cost, then returns to the top of security at End of Attack", () => {
    const compiled = runtimeCompiledCard("LM-007")!;
    expect(compiled.effects.find((entry) => entry.trigger === "Security")!.actions).toContainEqual(expect.objectContaining({ kind: "PlayWithoutCost", payCost: false }));
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfAttack")!.actions).toContainEqual(expect.objectContaining({ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true }));
  });
});
