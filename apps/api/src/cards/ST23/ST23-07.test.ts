import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST23-07.js";

describe("ST23-07 Armalizamon", () => {
  it("plays a Glowing Dawn Tamer from hand only with at most one own Tamer", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(runtimeCompiledCard("ST23-07")?.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "PlayWithoutCost", optional: true, condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] } } }],
      });
    }
  });
});
