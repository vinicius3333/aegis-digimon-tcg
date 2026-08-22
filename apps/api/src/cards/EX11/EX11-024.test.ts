import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-024.js";
import "../index.js";

describe("EX11-024 Cendrillmon", () => {
  it("has Alliance and Overclock", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-024", as: "cendrillmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("cendrillmon"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("cendrillmon"), "Overclock")).toBe(true);
  });
});
