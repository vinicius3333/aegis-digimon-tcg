import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT17-008.js";

const source = { instanceId: "source", cardId: "BT17-008", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT17-008", () => {
  it("registers the Calumon/Takato enter-field reaction and inherited DP threshold effect", () => {
    const module = getEffectModule("BT17-008");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });
});
