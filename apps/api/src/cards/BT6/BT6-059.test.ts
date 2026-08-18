import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-059.js";

describe("BT6-059 Mekanorimon", () => {
  it("has Decoy (Black)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-059", as: "mekanorimon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("mekanorimon"), "Decoy")).toBe(true);
  });
});
