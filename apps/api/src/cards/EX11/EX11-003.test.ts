import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import module from "./EX11-003.js";

describe("EX11-003 Puroromon", () => {
  it("subscribes to own face-up Royal Base security placement, not a generic turn draw", async () => {
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

    const makeTrigger = (faceUp: boolean, types: string[], seat = 0) => ({
      trigger: { addedToSecuritySeat: seat, addedToSecurityInstanceIds: ["card"] },
      game: {
        player: () => ({ security: [{ instanceId: "card", faceUp }] }),
        definitionOf: () => ({ types }),
      },
    });
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]!.matches(makeTrigger(true, ["Royal Base"]))).toBe(true);
    expect(subscriptions[0]!.matches(makeTrigger(false, ["Royal Base"]))).toBe(false);
    expect(subscriptions[0]!.matches(makeTrigger(true, ["LIBERATOR"]))).toBe(false);
    expect(subscriptions[0]!.matches(makeTrigger(true, ["Royal Base"], 1))).toBe(false);
  });
});
