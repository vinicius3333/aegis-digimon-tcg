import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-039.js";

describe("BT6-039 Pulsemon", () => {
  it("gives its host +1000 DP while you have at most 3 security cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT6-039"], as: "host" }], security: 3 } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
