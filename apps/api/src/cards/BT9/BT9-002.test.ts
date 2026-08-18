import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-002.js";

describe("BT9-002 Puyoyomon", () => {
  it("once per turn gives its host +1000 DP when an effect adds a card to its controller's hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-028", as: "host", under: ["BT9-002"] }], trash: [{ card: "BT1-001", as: "added" }] } });
    await advance(s.engine).verb.returnToHand([s.inst("added").instanceId]);
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
