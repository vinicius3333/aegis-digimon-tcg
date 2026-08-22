import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-018.js";
import "../index.js";

describe("EX11-018 Ryugumon", () => {
  it("has Evade and Decode", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-018", as: "ryugumon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ryugumon"), "Evade")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ryugumon"), "Decode")).toBe(true);
  });
});
