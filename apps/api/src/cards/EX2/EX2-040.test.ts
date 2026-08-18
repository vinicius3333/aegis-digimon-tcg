import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-040.js";

describe("EX2-040 Devidramon", () => {
  it("has Retaliation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-040", as: "devidramon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("devidramon"), "Retaliation")).toBe(true);
  });
});
