import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-025.js";
import "../index.js";

describe("EX11-025 FunBeemon", () => {
  it("grants its host +1000 DP as an inherited All Turns effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-025"] }] } });
    await s.ready();
    expect(observe(s.engine).currentDP(s.perm("host"))).toBe(4000);
  });
});
