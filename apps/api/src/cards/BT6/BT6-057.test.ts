import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../BT5/BT5-062.js";
import "./BT6-057.js";

describe("BT6-057 ToyAgumon", () => {
  it("gives +1000 DP to its host while the host has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-062", under: ["BT6-057"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
