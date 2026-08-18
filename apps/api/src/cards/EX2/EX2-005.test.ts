import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX2-005.js";

describe("EX2-005 Hopmon", () => {
  it("gives its host +1000 DP while its controller has a black Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-005"] }, "BT10-092"] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
