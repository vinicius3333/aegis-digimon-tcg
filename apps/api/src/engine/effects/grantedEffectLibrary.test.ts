import { EffectTiming, getCardDefinition, type CardColor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "./CardSource.js";
import { grantedTokenEffectsForTiming } from "./interpreter.js";

describe("granted effect library", () => {
  it("registers Lotosmon's granted body only in the On Deletion window", () => {
    const source: CardSource = {
      instanceId: "granted-recipient",
      cardId: "BT10-043",
      ownerSeat: 0,
      definition: getCardDefinition("BT10-043")!,
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => false,
      hasColor: (_color: CardColor) => false,
    };

    const token = "OnDeletionGain2MemoryAndReturn3000DP";
    expect(grantedTokenEffectsForTiming(token, EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
    expect(grantedTokenEffectsForTiming(token, EffectTiming.WhenDigivolving, source)).toHaveLength(0);
  });
});
