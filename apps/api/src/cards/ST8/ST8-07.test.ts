import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST8-07.js";

describe("ST8-07 Wingdramon", () => {
  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST8-07", as: "wing" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("wing"), "Blocker")).toBe(true);
  });
});
