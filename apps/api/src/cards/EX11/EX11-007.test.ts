import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-007.js";
import "../index.js";

describe("EX11-007 Agumon", () => {
  it("grants its host +1000 DP through the inherited All Turns effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-007"] }] } });
    await s.ready();
    expect(observe(s.engine).currentDP(s.perm("host"))).toBe(4000);
  });
});
