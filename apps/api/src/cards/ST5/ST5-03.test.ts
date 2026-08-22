import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-03.js";

describe("ST5-03 Agumon", () => {
  it("is fully represented as a static Blocker keyword", () => {
    expect(runtimeCompiledCard("ST5-03")).toMatchObject({ coverage: "full", residual: [], effects: [{ trigger: "Static", keywords: [{ keyword: "Blocker" }] }] });
  });

  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST5-03", as: "agumon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Blocker")).toBe(true);
  });
});
