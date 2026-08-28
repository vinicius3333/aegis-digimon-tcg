import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-052.js";

describe("EX2-052 ADR-06 Horn Striker", () => {
  it("has Rush during its turn while Mother D-Reaper is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-052", as: "striker" }, "EX2-007"] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("striker"), "Rush")).toBe(true);
  });
});
