import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-021 WezenGammamon", () => {
  it("has Blocker while in the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "RB1-021", as: "wezen" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("wezen"), "Blocker")).toBe(true);
  });

  it("does not grant Blocker to a different Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "RB1-021", as: "wezen" }, { card: "RB1-020", as: "other" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
  });
});
