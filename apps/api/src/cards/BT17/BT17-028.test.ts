import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT17-028.js";

const source = { instanceId: "source", cardId: "BT17-028", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT17-028", () => {
  it("registers lowest-level return, security-to-hand, and deletion effects", () => {
    const module = getEffectModule("BT17-028");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnAddHand, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
  });
});
