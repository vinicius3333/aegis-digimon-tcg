import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST4-07.js";

describe("ST4-07 Kuwagamon", () => {
  it("has complete residual-free runtime coverage and no effects", () => {
    expect(getEffectModule("ST4-07")).toBeDefined();
    expect(runtimeCompiledCard("ST4-07")).toMatchObject({ effects: [], coverage: "full", residual: [] });
  });
});
