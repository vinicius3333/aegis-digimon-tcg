import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST4-09.js";

describe("ST4-09 Okuwamon", () => {
  it("has complete residual-free runtime coverage and no effects", () => {
    expect(getEffectModule("ST4-09")).toBeDefined();
    expect(runtimeCompiledCard("ST4-09")).toMatchObject({ effects: [], coverage: "full", residual: [] });
  });
});
