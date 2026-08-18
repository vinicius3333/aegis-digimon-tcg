import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST5-11.js";

describe("ST5-11 Megadramon", () => {
  it("gives its host Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST5-12", under: ["ST5-11"], as: "host" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
