import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX7-037.js";

describe("EX7-037", () => {
  it("offers the NSp play effect and once-per-turn -7000 DP effect on digivolving", () => {
    const source = { instanceId: "source", cardId: "EX7-037", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX7-037")!;
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(2);
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source).map((effect) => effect.maxPerTurn)).toContain(1);
  });
  it("has the once-per-turn -7000 DP effect when attacking", () => {
    const source = { instanceId: "source", cardId: "EX7-037", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    expect(getEffectModule("EX7-037")!.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]?.maxPerTurn).toBe(1);
  });
});
