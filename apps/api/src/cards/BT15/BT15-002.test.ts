import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT15-002.js";

const source = { instanceId: "source", cardId: "BT15-002", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;

describe("BT15-002", () => {
  it("registers the inherited once-per-turn On Add to Hand DP effect", () => {
    const effects = getEffectModule("BT15-002")?.effectsForTiming(EffectTiming.OnAddHand, source);
    expect(effects).toHaveLength(1);
    expect(effects?.[0]).toMatchObject({ isInherited: true, maxPerTurn: 1 });
  });
});
