import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-023.js";
import "../index.js";

describe("EX11-023 Kaguyamon", () => {
  it("has Alliance and Scapegoat", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-023", as: "kaguyamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kaguyamon"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("kaguyamon"), "Scapegoat")).toBe(true);
  });
});
