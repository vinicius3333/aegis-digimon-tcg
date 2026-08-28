import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-07 Tankmon", () => {
  it("has Jamming while on the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST15-07", as: "tankmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("tankmon"), "Jamming")).toBe(true);
  });

  it("does not grant Jamming to an unrelated Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "vanilla" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("vanilla"), "Jamming")).toBe(false);
  });
});
