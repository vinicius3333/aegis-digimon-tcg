import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-034.js";

describe("EX2-034 Andromon", () => {
  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-034", as: "andromon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("andromon"), "Blocker")).toBe(true);
  });
});
