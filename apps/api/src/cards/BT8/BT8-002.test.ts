import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT8-002.js";

describe("BT8-002 Hiyarimon", () => {
  it("gives its host +1000 DP while the opponent has no Digimon with sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-002"] }] }, 1: { battleArea: ["BT8-034"] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
