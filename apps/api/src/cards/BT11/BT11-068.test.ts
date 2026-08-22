import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT11-068.js";
describe("BT11-068 Mamemon", () => {
  it("registers both reveal timings as dedicated effects", () => {
    const compiled = runtimeCompiledCard("BT11-068")!;
    expect(compiled.effects.filter(({ trigger }) => trigger === "OnPlay" || trigger === "WhenDigivolving")).toHaveLength(2);
    expect(compiled.effects.find(({ isInherited }) => isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed" }],
    });
  });
});
