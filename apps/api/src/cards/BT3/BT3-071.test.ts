import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-071.js";

describe("BT3-071 MetalMamemon", () => {
  it("has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-071", as: "metalMamemon" }] } });
    expect(observe(s.engine).hasKeyword(s.perm("metalMamemon"), "Reboot")).toBe(true);
  });
});
