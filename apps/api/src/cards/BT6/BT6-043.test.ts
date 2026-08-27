import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-043.js";

describe("BT6-043 SkullMammothmon", () => {
  it("has Blocker and gets +2000 DP while you have at most 3 security cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-043", as: "skull" }], security: 3 } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("skull"), "Blocker")).toBe(true);
    expect(s.perm("skull").currentDP).toBe(s.perm("skull").baseDP + 2000);
  });
});
