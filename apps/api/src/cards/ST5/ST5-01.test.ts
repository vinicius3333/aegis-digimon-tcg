import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-01.js";
import "./ST5-03.js";

describe("ST5-01 Kapurimon", () => {
  it("is fully represented as inherited IR", () => {
    expect(runtimeCompiledCard("ST5-01")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gives its host +1000 DP while it has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST5-03", under: ["ST5-01"], as: "host" }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(2000);
    await advance(s.engine).recompute();
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(2000);
  });
});
