import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-176.js";

describe("P-176 Dorimon", () => {
  it("encodes the inherited once-per-turn optional Chronicle digivolution from hand", () => {
    const effect = runtimeCompiledCard("P-176")!.effects.find((entry) => entry.trigger === "WhenAttacking")!;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{
        kind: "Digivolve",
        optional: true,
        from: ["hand"],
        target: { isSelf: true, count: 1, filter: { isSelfRef: true } },
        into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }] },
      }],
    });
  });
});
