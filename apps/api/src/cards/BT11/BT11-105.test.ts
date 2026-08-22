import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT11-105.js";
describe("BT11-105 Fusionize", () => {
  it("registers a dedicated optional security reveal effect", () => {
    const compiled = runtimeCompiledCard("BT11-105")!;
    expect(compiled.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.coverage).toBe("full");
  });
});
