import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("ST21-02 Gomamon", () => {
  it("matches the All Turns memory restriction and Tamer exception", () => {
    const action = runtimeCompiledCard("ST21-02")?.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];

    expect(action).toEqual({
      kind: "RestrictMemoryGain",
      seat: "opponent",
      exceptTamerEffects: true,
      duration: "permanent",
    });
  });
});
