import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-016.js";

describe("BT17-016", () => {
  it("deletes an opposing Digimon at 8000 DP or less on digivolution or attack", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", value: 8000 } } } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", condition: { kind: "ifThisEffectDidNotDelete" } });
      expect(effect.actions?.[2]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd", condition: { kind: "ifThisEffectDidNotDelete" } });
    }
  });

  it("gains immunity for the turn at 0 or less memory", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "GrantStatic", grant: { immunity: true }, duration: "forTheTurn", condition: { kind: "memoryAtMost", value: 0 } }] });
  });
});
