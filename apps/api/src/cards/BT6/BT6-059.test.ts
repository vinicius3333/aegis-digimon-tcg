import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-059.js";

describe("BT6-059 Machmon", () => {
  it("has Decoy (Black)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-059", as: "machmon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("machmon"), "Decoy")).toBe(true);
  });
});
