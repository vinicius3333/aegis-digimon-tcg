import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-054.js";

describe("EX8-054", () => {
  const source = { instanceId: "source", cardId: "EX8-054", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers Rush, Piercing, and Security Attack +1 static effects", () => expect(getEffectModule("EX8-054")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(3));
  it("registers once-per-turn Justimon effect borrowing and end-of-turn attack", () => {
    const module = getEffectModule("EX8-054")!;
    expect(module.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]?.maxPerTurn).toBe(1);
    expect(module.effectsForTiming(EffectTiming.OnEndTurn, source)[0]?.maxPerTurn).toBe(1);
  });
});
