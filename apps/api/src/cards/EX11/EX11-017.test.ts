import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-017.js";
import "../index.js";

describe("EX11-017 Skadimon", () => {
  it("has Iceclad and Barrier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-017", as: "skadimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("skadimon"), "Iceclad")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("skadimon"), "Barrier")).toBe(true);
  });
});
