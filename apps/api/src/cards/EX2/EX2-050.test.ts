import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-050.js";

describe("EX2-050 ADR-05 Creep Hands", () => {
  it("has Blocker on the opponent's turn while Mother D-Reaper is in play", async () => {
    const s = setupEngine({ 1: { battleArea: [{ card: "EX2-050", as: "creepHands" }, "EX2-007"] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("creepHands"), "Blocker")).toBe(true);
  });

  it("does not gain Blocker on the opponent's turn without Mother D-Reaper", async () => {
    const s = setupEngine({ 1: { battleArea: [{ card: "EX2-050", as: "creepHands" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("creepHands"), "Blocker")).toBe(false);
  });

  it("does not gain its opponent-turn Blocker during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-050", as: "creepHands" }, "EX2-007"] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("creepHands"), "Blocker")).toBe(false);
  });
});
