import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT17-010.js";

const source = { instanceId: "source", cardId: "BT17-010", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT17-010", () => {
  it("registers the mandatory When Digivolving delete-or-DP effect", () => {
    const module = getEffectModule("BT17-010");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
  });

  it("registers the inherited DP deletion maximum effect", () => {
    expect(getEffectModule("BT17-010")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });
});
