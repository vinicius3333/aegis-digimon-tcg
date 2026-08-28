import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-015.js";

describe("EX2-015 Seasarmon", () => {
  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-015", as: "seasarmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("seasarmon"), "Jamming")).toBe(true);
  });
});
