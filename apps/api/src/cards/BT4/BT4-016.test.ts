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

async function aldamonDpWithSources(under: string[]): Promise<number> {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT4-016", as: "alda", under }] } });
  await s.engine.recomputeContinuousEffects();
  return s.perm("alda").currentDP;
}

describe("BT4-016 Aldamon — KB Q&A rulings", () => {
  it("gets only +4000 DP when it has both a Hybrid Digimon card and a red Tamer card as sources (Q1171)", async () => {
    expect(await aldamonDpWithSources(["BT4-011", "BT1-085"])).toBe(11000);
    expect(await aldamonDpWithSources(["BT4-011"])).toBe(11000);
    expect(await aldamonDpWithSources(["BT1-085"])).toBe(11000);
  });

  it("needs a Hybrid Digimon card or a red Tamer card among its sources for the [Your Turn] DP bonus (Q1172)", async () => {
    expect(await aldamonDpWithSources(["BT4-011"])).toBe(11000);
    expect(await aldamonDpWithSources(["BT1-085"])).toBe(11000);
    expect(await aldamonDpWithSources(["BT4-012"])).toBe(7000);
    expect(await aldamonDpWithSources(["BT1-086"])).toBe(7000);
  });
});
