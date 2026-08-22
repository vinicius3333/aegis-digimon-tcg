import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-061.js";

describe("BT8-061 Thundermon", () => {
  it("is also treated as having the name Mamemon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-061", as: "thundermon" }] } });
    await s.ready();
    expect(observe(s.engine).grantedNames(s.perm("thundermon"))).toContain("mamemon");
  });
});
