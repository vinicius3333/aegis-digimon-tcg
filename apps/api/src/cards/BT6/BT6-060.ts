import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT6-060 — Deputymon (BT6, Black Lv.4 Digimon).
 *
 * [On Play] Reveal the top 4 cards of your deck. Add 1 Digimon card with
 * [Three Musketeers] in its traits and 1 Option card with a memory cost of 7
 * among them to your hand. Trash the remaining cards.
 *
 * [Your Turn] You may digivolve this Digimon into a [Three Musketeers] Digimon
 * from your hand for a digivolution cost of 6, ignoring digivolution requirements.
 */
const cardId = "BT6-060";

const THREE_MUSKETEERS = "Three Musketeers";
const THREE_MUSKETEERS_ALT = "ThreeMusketeers";

function hasThreeMusketeersTrait(def: CardDefinition): boolean {
  const traits = def.types as string[] | undefined;
  if (!traits) return false;
  return traits.includes(THREE_MUSKETEERS) || traits.includes(THREE_MUSKETEERS_ALT);
}

function isOptionsCost7(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes("Option")) return false;
  return def.playCost === 7;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [On Play] Reveal 4, add 2, trash rest
    if (timing === EffectTiming.OnPlay) {
      out.push(
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal top 4 of deck. Add 1 [Three Musketeers] Digimon and 1 cost-7 Option to hand. Trash rest.",
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => {
            const deck = ctx.game.player(source.ownerSeat).deck;
            if (deck.length === 0) return;
            const revealCount = Math.min(4, deck.length);
            const revealed = deck.slice(0, revealCount);
            const revealedIds = revealed.map((c) => c.instanceId);
            const threeMuskIds = revealed.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && hasThreeMusketeersTrait(def);
            }).map((c) => c.instanceId);
            const cost7Ids = revealed.filter((c) =>
              isOptionsCost7(ctx.game.definitionOf(c)),
            ).map((c) => c.instanceId);
            const added: string[] = [];
            // First selection: 1 Three Musketeers Digimon
            if (threeMuskIds.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: threeMuskIds,
                min: 1,
                max: 1,
                visible: revealedIds,
                visibleCards: revealed.map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              added.push(...chosen);
            }
            // Second selection: 1 cost-7 Option
            if (cost7Ids.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: cost7Ids,
                min: 1,
                max: 1,
                visible: revealedIds,
                visibleCards: revealed.map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              added.push(...chosen);
            }
            for (const id of added) {
              await ctx.fx.returnToHand([id]);
            }
            const addedSet = new Set(added);
            const rest = revealed.filter((c) => !addedSet.has(c.instanceId)).map((c) => c.instanceId);
            if (rest.length > 0) await ctx.fx.trash(rest);
          },
        }),
      );
    }

    // [Your Turn] Digivolve into Three Musketeers from hand (cost 6)
    if (timing === EffectTiming.OnDeclaration) {
      out.push({
        effectKey: `${cardId}/digivolve-three-musketeers`,
        description:
          "[Your Turn] You may digivolve this Digimon into a [Three Musketeers] Digimon from your hand for a cost of 6, ignoring requirements.",
        optional: true,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
        canActivate: (ctx) => {
          const perm = source.permanent();
          if (perm === undefined) return false;
          return ctx.game.player(source.ownerSeat).hand.some((card) => {
            const definition = ctx.game.definitionOf(card);
            return isDigimon(definition) && hasThreeMusketeersTrait(definition);
          });
        },
        resolve: async (ctx) => {
          const perm = source.permanent();
          if (!perm) return;
          const hand = ctx.game.player(source.ownerSeat).hand;
          const candidates = hand.filter((c) => {
            const def = ctx.game.definitionOf(c);
            return isDigimon(def) && hasThreeMusketeersTrait(def);
          });
          if (candidates.length === 0) return;
          const chosen = await ctx.ask.selectCards(ctx, {
            candidates: candidates.map((c) => c.instanceId),
            min: 0,
            max: 1,
          });
          if (chosen.length === 0) return;
          await ctx.fx.digivolveFromInstance(perm.permanentId, chosen[0]!, {
            payCost: true,
            costOverride: 6,
            ignoreRequirements: true,
          });
        },
      });
    }

    return out;
  },
};

registerCard(module);
export default module;
