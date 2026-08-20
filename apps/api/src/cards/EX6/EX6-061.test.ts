import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-061.js";

describe("EX6-061 Gate of Deadly Sins", () => {
  it("registers a once-per-turn played-Digimon reaction and a leave-field placement reaction", () => {
    const source = { instanceId: "source", cardId: "EX6-061", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX6-061")!;
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)[0]?.maxPerTurn).toBe(1);
    expect(module.effectsForTiming(EffectTiming.OnLeaveFieldAnyone, source)).toHaveLength(1);
  });
});
