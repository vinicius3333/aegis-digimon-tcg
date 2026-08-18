import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-10.js";

describe("ST7-10 ShineGreymon", () => {
  it("has Security Attack +1 and Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST7-10", as: "shine" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasPierce(s.perm("shine"))).toBe(true);
  });
});
