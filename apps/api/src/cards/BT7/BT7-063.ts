import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT7-063 — DarkKnightmon (Purple Lv.5 Digimon).
 *
 *
 * [On Play] You may place 1 [SkullKnightmon] and 1 [DeadlyAxemon] from your hand
 * and/or trash in this Digimon's digivolution cards in any order.
 *
 * [All Turns] When this Digimon would be deleted, you may play 1 [SkullKnightmon]
 * and 1 [DeadlyAxemon] from this Digimon's digivolution cards suspended without
 * paying their memory costs.
 */
const cardId = "BT7-063";

function isSkullKnightmon(def: CardDefinition): boolean {
  return def.nameEn === "SkullKnightmon";
}

function isDeadlyAxemon(def: CardDefinition): boolean {
  return def.nameEn === "DeadlyAxemon";
}

function isSkullKnightmonOrDeadlyAxemon(def: CardDefinition): boolean {
  return isSkullKnightmon(def) || isDeadlyAxemon(def);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Place up to 1 SkullKnightmon and up to 1 DeadlyAxemon from
    // hand and/or trash as digivolution cards.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-place-under`,
          description:
            "[On Play] You may place 1 [SkullKnightmon] and 1 [DeadlyAxemon] from " +
            "your hand and/or trash in this Digimon's digivolution cards in any order.",
          optional: true,
          canActivate: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;

            const owner = ctx.game.player(source.ownerSeat);
            const placedCards: string[] = [];

            // Part 1: Select SkullKnightmon from hand or trash.
            const skullHand = owner.hand.filter((c) =>
              isSkullKnightmon(ctx.game.definitionOf(c)),
            );
            const skullTrash = owner.trash.filter((c) =>
              isSkullKnightmon(ctx.game.definitionOf(c)),
            );
            const skullCandidates = [
              ...skullHand.map((c) => c.instanceId),
              ...skullTrash.map((c) => c.instanceId),
            ];

            if (skullCandidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: skullCandidates,
                min: 0,
                max: 1,
                visibleCards: [...skullHand, ...skullTrash].map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              placedCards.push(...chosen);
            }

            // Part 2: Select DeadlyAxemon from hand or trash.
            const deadlyHand = owner.hand.filter((c) =>
              isDeadlyAxemon(ctx.game.definitionOf(c)),
            );
            const deadlyTrash = owner.trash.filter((c) =>
              isDeadlyAxemon(ctx.game.definitionOf(c)),
            );
            const deadlyCandidates = [
              ...deadlyHand.map((c) => c.instanceId),
              ...deadlyTrash.map((c) => c.instanceId),
            ];

            if (deadlyCandidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: deadlyCandidates,
                min: 0,
                max: 1,
                visibleCards: [...deadlyHand, ...deadlyTrash].map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              placedCards.push(...chosen);
            }

            if (placedCards.length > 0) {
              let ordered = placedCards;
              if (ordered.length > 1 && ctx.ask.orderCards !== undefined) {
                ordered = await ctx.ask.orderCards(ctx, {
                  candidates: ordered,
                  visibleCards: [...skullHand, ...skullTrash, ...deadlyHand, ...deadlyTrash]
                    .filter((card) => ordered.includes(card.instanceId))
                    .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                  destination: "stackBottom",
                });
              }
              await ctx.fx.placeUnder(self.permanentId, [...ordered].reverse());
            }
          },
        }),
      ];
    }

    // [All Turns] When this Digimon would be deleted, you may play SkullKnightmon
    // and DeadlyAxemon from its digivolution cards suspended.
    if (timing === EffectTiming.WhenPermanentWouldBeDeleted) {
      return [
        {
          effectKey: `${cardId}/would-be-deleted-play-divo-cards`,
          description:
            "[All Turns] When this Digimon would be deleted, you may play 1 [SkullKnightmon] " +
            "and 1 [DeadlyAxemon] from this Digimon's digivolution cards suspended without " +
            "paying their memory costs.",
          optional: true,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (self === undefined) return false;
            return self.stack.some((c) =>
              isSkullKnightmonOrDeadlyAxemon(ctx.game.definitionOf(c)),
            );
          },
          canActivate: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;

            const skullKnightmon = self.stack.filter((card) =>
              isSkullKnightmon(ctx.game.definitionOf(card)),
            );
            const deadlyAxemon = self.stack.filter((card) =>
              isDeadlyAxemon(ctx.game.definitionOf(card)),
            );
            if (skullKnightmon.length === 0 && deadlyAxemon.length === 0) return;

            const chosen: string[] = [];
            if (skullKnightmon.length > 0) {
              const selected = skullKnightmon.length === 1
                ? [skullKnightmon[0]!.instanceId]
                : await ctx.ask.selectCards(ctx, {
                    candidates: skullKnightmon.map((card) => card.instanceId),
                    min: 1,
                    max: 1,
                  });
              chosen.push(...selected);
            }
            if (deadlyAxemon.length > 0) {
              const selected = deadlyAxemon.length === 1
                ? [deadlyAxemon[0]!.instanceId]
                : await ctx.ask.selectCards(ctx, {
                    candidates: deadlyAxemon.map((card) => card.instanceId),
                    min: 1,
                    max: 1,
                  });
              chosen.push(...selected);
            }

            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, {
                payCost: false,
                suspended: true,
              });
            }
          },
        },
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
