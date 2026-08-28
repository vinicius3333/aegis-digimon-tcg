import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-026.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-026", () => {
  it("reduces an opposing Digimon's DP by 3000 on play and digivolving", () => {
    expect(compiled.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))).toHaveLength(2);
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "forTheTurn",
      target: { count: 1 },
    });
  });
  it("inherits Barrier", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Barrier",
      raw: "＜Barrier＞",
    }));

  it("reduces one opposing Digimon by 3000 DP on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX7-026", as: "star" }] }, 1: { battleArea: [{ card: "EX7-011", as: "target" }] } },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("star"));
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });
});
