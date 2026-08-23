import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-11.js";

describe("ST5-11 Megadramon", () => {
  it("is fully represented as an inherited Blocker keyword", () => {
    expect(runtimeCompiledCard("ST5-11")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [{ trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] }],
    });
  });

  it("gives its host Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST5-12", under: ["ST5-11"], as: "host" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
