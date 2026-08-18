import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-037.js";

describe("EX2-037 Reapermon", () => {
  it("has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-037", as: "reapermon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("reapermon"), "Reboot")).toBe(true);
  });
});
