import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX10-004.js";

describe("EX10-004 Cupimon inherited move trigger", () => {
  it("trashes a hand card before drawing and gaining memory", async () => {
    const source: CardSource = {
      instanceId: "host#cupimon",
      cardId: "EX10-004",
      ownerSeat: 0,
      definition: getCardDefinition("EX10-004")!,
      permanent: () => ({ permanentId: "host" } as never),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const hand = [{ instanceId: "cost#1", cardId: "BT1-009" }];
    const lucemon = {
      permanentId: "lucemon",
      controllerSeat: 0,
      topCard: { instanceId: "lucemon#1", cardId: "EX10-013" },
    };
    let subscription: any;
    const trashed: string[][] = [];
    let drawn = 0;
    let gained = 0;
    const ctx: any = {
      source,
      trigger: {},
      game: {
        player: () => ({ hand }),
        permanentById: (id: string) => (id === "lucemon" ? lucemon : undefined),
        definitionOf: (card: { cardId: string }) => getCardDefinition(card.cardId)!,
      },
      fx: {
        subscribeSubTrigger: (sub: unknown) => { subscription = sub; },
      },
    };
    const effect = getEffectModule("EX10-004")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve(ctx);
    expect(subscription).toBeDefined();
    expect(subscription.matches({ ...ctx, trigger: { subjectPermanentId: "lucemon" } })).toBe(true);

    const runCtx = {
      ...ctx,
      trigger: { subjectPermanentId: "lucemon" },
      ask: { selectCards: async () => ["cost#1"] },
      fx: {
        trash: async (ids: string[]) => { trashed.push(ids); },
        draw: () => { drawn += 1; },
        gainMemory: () => { gained += 1; },
      },
    };
    await subscription.run(runCtx);
    expect(trashed).toEqual([["cost#1"]]);
    expect(drawn).toBe(1);
    expect(gained).toBe(1);
  });
});
