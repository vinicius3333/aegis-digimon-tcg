import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT15-046.js";

const source = { instanceId: "source", cardId: "BT15-046", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;

describe("BT15-046", () => {
  it("registers the draw trigger on your Digimon becoming suspended", () => {
    const effects = getEffectModule("BT15-046")?.effectsForTiming(EffectTiming.OnTappedAnyone, source);
    expect(effects).toHaveLength(1);
    expect(effects?.[0]).toMatchObject({ maxPerTurn: 1 });
  });
});
