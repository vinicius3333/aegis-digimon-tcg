import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT17-034.js";

const source = { instanceId: "source", cardId: "BT17-034", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT17-034", () => {
  it("registers dual security branches, security-trash recovery, and inherited DP", () => {
    const module = getEffectModule("BT17-034");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnDiscardSecurity, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });
});
