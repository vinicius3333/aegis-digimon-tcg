import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX7-014.js";

describe("EX7-014 DoruGreymon", () => {
  it("registers play/digivolving effects, attack deletion, and once-per-turn leave replacement", () => {
    const source = { instanceId: "source", cardId: "EX7-014", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX7-014")!;
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(2);
    expect(module.effectsForTiming(EffectTiming.OnAllyAttack, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.None, source)[0]?.maxPerTurn).toBe(1);
  });
});
