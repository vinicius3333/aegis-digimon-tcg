import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-014.js";

describe("EX1-014 ExVeemon", () => {
  it("has Jamming as its main keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-014", as: "exveemon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("exveemon"), "Jamming")).toBe(true);
  });

  it("grants inherited Jamming to a Free-trait host on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-019", as: "freeHost", under: ["EX1-014"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("freeHost"), "Jamming")).toBe(true);
  });
});
