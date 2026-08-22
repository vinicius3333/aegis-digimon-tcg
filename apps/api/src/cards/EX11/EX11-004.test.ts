import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import module from "./EX11-004.js";

describe("EX11-004 Kapurimon", () => {
  it("subscribes to face-up cards added to the opponent's security", async () => {
    const subscriptions: Array<{ matches: (ctx: any) => boolean }> = [];
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "host" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as any;
    const effect = module.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      fx: { subscribeSubTrigger: (subscription: any) => subscriptions.push(subscription) },
    } as any);

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]!.matches({ source })).toBe(true);
    expect(
      subscriptions[0]!.matches({
        source: { ...source, isOwnersTurn: () => false },
      }),
    ).toBe(false);
  });
});
