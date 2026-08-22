import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-188.js";

describe("P-188 DemiVeemon", () => {
  it("draws once per turn when one of your blue Tamers is played", () => {
    expect(runtimeCompiledCard("P-188")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Blue"] }, actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }],
    });
  });
});
