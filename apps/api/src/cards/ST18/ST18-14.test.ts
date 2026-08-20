import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../../cards/index.js";

describe("ST18-14 Yoshino Fujieda", () => {
  it("installs the redirect watcher that can target an opponent Digimon or player", async () => {
    const module = getEffectModule("ST18-14");
    const self = { permanentId: "st18-14", topCard: undefined };
    const source = { cardId: "ST18-14", instanceId: "test", ownerSeat: 0, permanent: () => self, isOnBattleArea: () => true } as never;
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    const subscriptions: Array<{ event: string }> = [];
    await effects[0]!.resolve({ source, fx: { subscribeSubTrigger: (sub: { event: string }) => subscriptions.push(sub) } } as never);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]).toMatchObject({ event: "whenAttacking", sourcePermanentId: "st18-14" });
  });
});
