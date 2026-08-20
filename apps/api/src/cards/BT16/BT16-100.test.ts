import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT16-100.js";

const source = { instanceId: "source", cardId: "BT16-100", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT16-100", () => {
  it("registers color waiver, security cost reduction, Main, and Security effects", () => {
    const module = getEffectModule("BT16-100");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.BeforePayCost, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("does not expose unrelated timing effects", () => {
    expect(getEffectModule("BT16-100")!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });
});
