import { describe, expect, it, vi } from "vitest";
import { EffectTiming, CardColor } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT25-020.js";

describe("BT25-020 Marsmon", () => {
  it("installs the hand-resident 13000 DP play-cost reduction", () => {
    const module = getEffectModule("BT25-020");
    expect(module?.effectsForTiming(EffectTiming.None, { cardId: "BT25-020" } as never)).toHaveLength(2);
  });

  it("installs a once-per-turn battle-won watcher for own TS Digimon", () => {
    const module = getEffectModule("BT25-020");
    const subscribeSubTrigger = vi.fn();
    const source = {
      cardId: "BT25-020",
      instanceId: "marsmon-1",
      ownerSeat: 0,
      definition: { cardId: "BT25-020", colors: [CardColor.Red], kinds: ["Digimon"] },
      permanent: () => ({ permanentId: "marsmon-p", topCard: { instanceId: "marsmon-i", cardId: "BT25-020" } }),
    } as never;
    const effects = module?.effectsForTiming(EffectTiming.None, source) ?? [];
    expect(effects).toHaveLength(2);
    const ctx = {
      source,
      fx: { subscribeSubTrigger },
    } as never;
    return effects[1]!.resolve(ctx).then(() => {
      expect(subscribeSubTrigger).toHaveBeenCalledWith(expect.objectContaining({ event: "whenBattleWon", once: false }));
    });
  });
});
