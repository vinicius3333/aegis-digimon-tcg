import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-001.js";

describe("EX11-001 Koromon", () => {
  it("compiles its inherited once-per-turn attack digivolution permission", () => {
    const compiled = runtimeCompiledCard("EX11-001");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Digivolve",
            optional: true,
            from: ["hand"],
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Tyrannomon"], match: "name" },
                { tokens: ["Dinosaur"], match: "trait" },
              ],
            },
          }),
        ],
      }),
    );
  });
});
