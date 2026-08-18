import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-076.js";

describe("BT8-076 Fangmon", () => {
  it("has Retaliation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-076", as: "fangmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("fangmon"), "Retaliation")).toBe(true);
  });
});
