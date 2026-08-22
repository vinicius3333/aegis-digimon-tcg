import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST4-05.js";

describe("ST4-05 Kunemon", () => {
  it("has complete residual-free runtime coverage and no effects", () => {
    expect(getEffectModule("ST4-05")).toBeDefined();
    expect(runtimeCompiledCard("ST4-05")).toMatchObject({ effects: [], coverage: "full", residual: [] });
  });
});
