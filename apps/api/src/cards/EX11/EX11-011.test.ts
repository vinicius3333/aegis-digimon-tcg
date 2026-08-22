import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-011.js";
import "../index.js";

describe("EX11-011 Dinomon", () => {
  it("has Security Attack +1 and Fortitude on the real card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-011", as: "dinomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("dinomon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dinomon"), "Fortitude")).toBe(true);
  });
});
