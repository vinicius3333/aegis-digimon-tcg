import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../../cards/index.js";

describe("ST24-11 Lilamon", () => {
  it("installs both All Turns trigger sources: opponent suspension and Tamer-stack trash", async () => {
    const module = getEffectModule("ST24-11");
    const self = { permanentId: "st24-11", topCard: undefined };
    const source = { cardId: "ST24-11", instanceId: "test", ownerSeat: 0, permanent: () => self, isOnBattleArea: () => true } as never;
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("ST24-11/on-suspend-security");
    const subscriptions: Array<{ event: string }> = [];
    await effects[0]!.resolve({ source, fx: { subscribeSubTrigger: (sub: { event: string }) => subscriptions.push(sub) } } as never);
    expect(subscriptions.map(({ event }) => event)).toEqual(["whenSuspended", "whenDigivolutionTrashed"]);
  });
});
