import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST4-02.js";

describe("ST4-02 Floramon", () => {
  it("has complete residual-free runtime coverage and no effects", () => {
    expect(getEffectModule("ST4-02")).toBeDefined();
    expect(runtimeCompiledCard("ST4-02")).toMatchObject({ effects: [], coverage: "full", residual: [] });
  });
});
