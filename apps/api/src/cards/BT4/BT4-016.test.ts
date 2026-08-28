import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-016.js";

describe("BT4-016 Aldamon", () => {
  it("gets Security Attack +1 and +4000 DP with a Hybrid source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-016", as: "alda", under: ["BT4-011"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("alda"), "SecurityAttack")).toBe(1);
    expect(s.perm("alda").currentDP).toBe(11000);
  });

  it("also gets +4000 DP with only a red Tamer source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-016", as: "alda", under: ["BT1-085"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("alda").currentDP).toBe(11000);
  });

  it("does not get +4000 DP without either qualifying source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-016", as: "alda", under: ["BT4-012"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("alda"), "SecurityAttack")).toBe(1);
    expect(s.perm("alda").currentDP).toBe(7000);
  });

  it("gets the DP bonus only once when it has both qualifying source types", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-016", as: "alda", under: ["BT4-011", "BT1-085"] }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("alda").currentDP).toBe(11000);
  });
});
