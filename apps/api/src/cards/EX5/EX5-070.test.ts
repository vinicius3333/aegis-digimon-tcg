import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-070.js";
import "./EX5-070.js";

describe("EX5-070 X Antibody Proto Form", () => {
  it("registers static color waiver, security return, and Main X Antibody evolution effects", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]?.kind).toBe(
      "WaiveColorRequirement",
    );
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions[0]?.kind).toBe("AddToHandSelf");
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0]?.kind).toBe("Digivolve");
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({
      target: {
        filter: {
          digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"], match: "name", negate: true }],
        },
      },
    });
  });
  it("registers the inherited leave-field return and security placement effect", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.isInherited).toBe(true);
  });
});
