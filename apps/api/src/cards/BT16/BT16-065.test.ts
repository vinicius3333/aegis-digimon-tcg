import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT16-065.js";

const source = { instanceId: "source", cardId: "BT16-065", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT16-065", () => {
  it("registers play-cost reduction, reveal/delete, and end-of-turn DNA effects", () => {
    const module = getEffectModule("BT16-065");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.BeforePayCost, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnEndTurn, source)).toHaveLength(1);
  });

  it("does not expose unrelated timing effects", () => {
    expect(getEffectModule("BT16-065")!.effectsForTiming(EffectTiming.OnSecurityCheck, source)).toHaveLength(0);
  });
});
