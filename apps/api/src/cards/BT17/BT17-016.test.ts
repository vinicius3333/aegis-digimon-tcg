import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-016.js";

describe("BT17-016", () => {
  it("deletes an opposing Digimon at 8000 DP or less on digivolution or attack", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 8000 } } },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "untilOpponentTurnEnd",
        condition: { kind: "ifThisEffectDidNotDelete" },
      });
      expect(effect.actions?.[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
        condition: { kind: "ifThisEffectDidNotDelete" },
      });
    }
  });

  it("gains immunity for the turn at 0 or less memory", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          grant: { immunity: true },
          duration: "forTheTurn",
          condition: { kind: "memoryAtMost", value: 0 },
        },
      ],
    });
  });

  it("deletes an opposing 8000 DP Digimon when the effect is fired", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-016", as: "gallant" }] },
      1: { battleArea: [{ card: "BT1-015", as: "target" }] },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gallant"));
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
  });

  it("gains DP and Blocker when no opposing Digimon is within range", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-016", as: "gallant" }] },
      1: { battleArea: [{ card: "BT1-059", as: "target" }] },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("gallant"));
    expect(s.perm("gallant").currentDP).toBe(14000);
    expect(observe(s.engine).hasKeyword(s.perm("gallant"), "Blocker")).toBe(true);
  });
});
