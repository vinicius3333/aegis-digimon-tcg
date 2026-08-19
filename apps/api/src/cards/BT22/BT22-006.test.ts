import { describe, expect, it } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT22-006.js";

describe("BT22-006 Moonmon", () => {
  it("installs a once-per-turn bottom-stack placement watcher", async () => {
    const permanent = {
      permanentId: "moon",
      topCard: { instanceId: "moon-card", cardId: "BT22-006", ownerSeat: 0 as Seat },
      stack: [],
      linked: [],
    };
    const source: CardSource = {
      instanceId: "moon-card",
      cardId: "BT22-006",
      ownerSeat: 0 as Seat,
      definition: {} as any,
      permanent: () => permanent as any,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };
    let subscription: any;
    const ctx: any = {
      source,
      game: { player: () => ({ hand: [] }), definitionOf: () => ({}) },
      fx: {
        subscribeSubTrigger: (value: any) => {
          subscription = value;
        },
      },
      ask: {},
    };
    const effect = getEffectModule("BT22-006")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve(ctx);
    expect(subscription).toMatchObject({
      event: "onAddDigivolutionCards",
      oncePerTurnKey: "BT22-006/on-add-divo-draw-trash",
    });
    const subContext = { source, trigger: { addedDigivolutionCardsPosition: "bottom" }, game: ctx.game };
    expect(subscription.matches(subContext)).toBe(true);
    expect(subscription.matches({ ...subContext, trigger: { addedDigivolutionCardsPosition: "top" } })).toBe(false);
  });
});
