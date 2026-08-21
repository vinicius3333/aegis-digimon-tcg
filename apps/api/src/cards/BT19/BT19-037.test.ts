import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-037", () => {
  it("preserves Blast Digivolve, turn-based option play, opponent debuffs, and inherited DP reduction", () => {
    const card = runtimeCompiledCard("BT19-037");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Counter", keywords: [{ keyword: "BlastDigivolve" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "UseOptionWithoutCost", filter: { kind: ["Option"], colorCount: 1, playCostLte: 5 } },
          { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } },
          { kind: "DisableTimingEffect", timings: ["whenDigivolving"] },
        ],
      })),
      {
        trigger: "WhenAttacking",
        isInherited: true,
        actions: [{ kind: "ModifyDP", amount: -4000 }],
      },
    ]);
  });
});
