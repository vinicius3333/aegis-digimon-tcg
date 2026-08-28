import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-038.js";

describe("EX1-038 Stingmon", () => {
  it("has Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-038", as: "stingmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("stingmon"))).toBe(true);
  });

  it("grants inherited Piercing to an Imperialdramon or Free host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-038"] }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });
});
