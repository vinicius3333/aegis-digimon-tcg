import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * P-097 — Zubamon (P, Red Lv.3 Digimon).
 *
 *
 * Authoritative text:
 *   [On Play] By placing this card under 1 of your other Digimon in play as its bottom
 *     digivolution card, reveal the top 3 cards of your deck. Place those cards at either
 *     the top or bottom of your deck in any order. Then, if you have a Digimon with the
 *     [Legend-Arms] trait in play, gain 2 memory.
 *   [Your Turn] (Inherited) While you have a Digimon with the [Legend-Arms] trait OR a
 *     black Digimon in play, this Digimon gains ＜Raid＞.
 *
 *   EffectTiming.OnEnterFieldAnyone: optional — select another own Digimon, place this
 *     card under it as a bottom digivolution card (cost), reveal top 3, let player
 *     place each card at top or bottom, then GainMemory 2 if Legend-Arms in play
 *     (documented behavior).
 *   EffectTiming.OnAllyAttack: inherited Raid if you have Legend-Arms OR black Digimon
 *     (documented behavior); modeled as EffectTiming.None staticModifier (Raid is static).
 *
 * `RemainingCardsPlace.DeckTopOrBottom` asks once whether the revealed group goes to the
 * top or bottom, then lets its controller order that group. Aegis mirrors that with a
 * chooseOption decision followed by orderCards.
 */
const cardId = "P-097";

const hasLegendArmsTrait = (def: CardDefinition): boolean =>
  (def.types as string[] | undefined)?.includes("Legend-Arms") ?? false;

const legendArmsInPlay = (ctx: EffectContext, ownerSeat: 0 | 1): boolean =>
  Array.from(ctx.game.player(ownerSeat).battleArea).some((p: Permanent) => {
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) && hasLegendArmsTrait(def);
  });

const blackOrLegendArmsInPlay = (ctx: EffectContext, ownerSeat: 0 | 1): boolean => {
  for (const p of ctx.game.player(ownerSeat).battleArea) {
    if (p.topCard === undefined) continue;
    const def = ctx.game.definitionOf(p.topCard);
    if (!isDigimon(def)) continue;
    if (hasLegendArmsTrait(def)) return true;
    const colors = def.colors as string[] | undefined;
    if (colors?.includes("Black")) return true;
  }
  return false;
};

const otherOwnDigimon = (ctx: EffectContext, source: CardSource): Permanent[] =>
  Array.from(ctx.game.player(source.ownerSeat).battleArea).filter((p: Permanent) => {
    if (p.topCard === undefined) return false;
    if (p.topCard.instanceId === source.instanceId) return false;
    const definition = ctx.game.definitionOf(p.topCard);
    return isDigimon(definition) && definition.isToken !== true;
  });

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] By placing this card under 1 of your other Digimon as its bottom
    // digivolution card, reveal top 3 of deck, choose top/bottom and their order, then
    // gain 2 memory if Legend-Arms is still in play.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-place-reveal-memory`,
          description:
            "[On Play] By placing this card under 1 of your other Digimon in play as its " +
            "bottom digivolution card, reveal the top 3 cards of your deck. Place those cards " +
            "at either the top or bottom of your deck in any order. Then, if you have a " +
            "Digimon with the [Legend-Arms] trait in play, gain 2 memory.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return otherOwnDigimon(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const targets = otherOwnDigimon(ctx, source);
            if (targets.length === 0) return;

            // Select the host Digimon that will receive this card as a digivolution card.
            const [chosenId] = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosenId === undefined) return;

            // Relocate this permanent (self) under the chosen Digimon as its digivolution card.
            // placeUnder only works for loose instances (hand/trash/etc); a played Digimon is
            // a full permanent on the battle area, so relocatePermanent is the correct call.
            const selfPermanent = source.permanent?.();
            if (selfPermanent === undefined) return;
            const moved = ctx.fx.relocatePermanent(chosenId, selfPermanent.permanentId);
            if (!moved) return;

            // Reveal top 3 of the owner's deck.
            const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
            if (revealed.length === 0) return;

            const toTop = await ctx.ask.chooseOption(ctx, ["top", "bottom"]) === 0;
            const revealedIds = revealed.map((card) => card.instanceId);
            const ordered = revealedIds.length > 1 && ctx.ask.orderCards !== undefined
              ? await ctx.ask.orderCards(ctx, {
                  candidates: revealedIds,
                  visibleCards: revealed.map((card) => ({
                    instanceId: card.instanceId,
                    cardId: card.cardId,
                  })),
                  destination: toTop ? "deckTop" : "deckBottom",
                })
              : revealedIds;

            // orderCards is nearest-deck-top first. Prepending sequential cards reverses
            // them physically, while appending to the bottom preserves that order.
            await ctx.fx.returnToDeck(toTop ? [...ordered].reverse() : ordered, { toTop });

            if (legendArmsInPlay(ctx, source.ownerSeat)) {
              ctx.fx.gainMemory(2);
            }
          },
        }),
      ];
    }

    // [Your Turn][Inherited] While you have a Digimon with [Legend-Arms] OR a black
    // Digimon in play, this Digimon gains ＜Raid＞.
    // a None staticModifier so Raid is continuously re-granted during your turn.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/static-inherited-raid`,
          description:
            "[Your Turn][Inherited] While you have a Digimon with the [Legend-Arms] trait or " +
            "a black Digimon in play, this Digimon gains ＜Raid＞.",
          isInherited: true,
          when: (ctx) => {
            if (!source.isOwnersTurn()) return false;
            return blackOrLegendArmsInPlay(ctx, source.ownerSeat);
          },
          resolve: async (ctx) => {
            const self = source.permanent?.();
            if (self === undefined) return;
            if (!blackOrLegendArmsInPlay(ctx, source.ownerSeat)) return;
            ctx.fx.grantKeyword(self.permanentId, "Raid", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
