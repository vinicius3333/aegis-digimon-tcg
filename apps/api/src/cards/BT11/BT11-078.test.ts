import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-078.js";

describe("BT11-078 Soulmon", () => {
  it("has Retaliation and receives its own +2000 DP aura", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-078", as: "soulmon" }] } });
    const printedDP = s.perm("soulmon").baseDP;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("soulmon"), "Retaliation")).toBe(true);
    expect(s.perm("soulmon").currentDP).toBe(printedDP + 2000);
  });
});
