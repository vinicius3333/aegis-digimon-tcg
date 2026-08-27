import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-010.js";

describe("BT6-010 Flamemon", () => {
  it("grants Piercing to a Hybrid host during your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", under: ["BT6-010"], as: "hybrid" }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("hybrid"))).toBe(true);
  });
});
