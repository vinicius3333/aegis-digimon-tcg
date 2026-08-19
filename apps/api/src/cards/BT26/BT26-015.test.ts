import { describe, expect, it } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import module from "./BT26-015.js";
import "../index.js";

const definition = (overrides: Partial<CardDefinition>): CardDefinition =>
  ({
    cardId: "TEST-001",
    set: "TEST",
    nameEn: "Test",
    kinds: [],
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...overrides,
  }) as CardDefinition;

describe("BT26-015 Butenmon", () => {
  it("recognizes Chronomon in the host's inherited text for its inherited effect (Q6970)", async () => {
    const host: Permanent = {
      permanentId: "host",
      controllerSeat: 0,
      inBreeding: false,
      isSuspended: true,
      topCard: { instanceId: "host-card", cardId: "HOST" },
      stack: [],
      currentDP: 6000,
      baseDP: 6000,
      dpModifiers: [],
      attachedOptionInstanceIds: [],
      keywords: new Set(),
    } as unknown as Permanent;
    const source = {
      ownerSeat: 0,
      permanent: () => host,
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    let subscription: { matches?: (ctx: EffectContext) => boolean } | undefined;
    const ctx = {
      source,
      game: {
        permanentById: (id: string) => (id === "host" ? host : undefined),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "HOST"
            ? definition({ cardId: "HOST", inheritedEffectText: "[When Attacking] [Chronomon]" })
            : definition({ cardId: card.cardId }),
      },
      fx: {
        subscribeSubTrigger: (value: { matches?: (ctx: EffectContext) => boolean }) => {
          subscription = value;
        },
      },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.None, source).find((candidate) => candidate.isInherited)!;
    await effect.resolve(ctx);

    expect(subscription?.matches).toBeDefined();
    expect(
      subscription!.matches!({
        source,
        trigger: { effectAddedToDeckSeat: 0 },
        game: ctx.game,
      } as unknown as EffectContext),
    ).toBe(true);
  });
});
