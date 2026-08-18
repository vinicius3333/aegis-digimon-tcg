import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT14-088 — MameTyramon (BT14, Green Digimon).
 *
 *
 * Printed text (no errata):
 *   [On Play] Reveal the top 5 cards of your deck. Add 1 level 3 Digimon card and
 *   1 non-white Tamer card among them to your hand. Place the rest at the bottom of
 *   your deck in any order.
 *   [Opponent's Turn] When your opponent's level 5 or higher Digimon attacks, by
 *   suspending this Tamer, you may move a Digimon from your breeding area to your
 *   battle area.
 *   [Security] Play this card without paying its memory cost.
 */
const cardId = "BT14-088";

function isNonWhiteTamer(def: { kinds?: string[]; colors?: string[] }): boolean {
  if (!isTamer(def as any)) return false;
  return !(def.colors as string[] | undefined)?.includes("White" as any);
}

/**
 * Whether an opponent's level-5-or-higher Digimon is the attacker of the current attack
 * (OnAllyAttack fires for every attack; filter to opponent-controlled + level gate).
 */
function isOpponentLevel5PlusAttacker(ctx: EffectContext, source: CardSource): boolean {
  const attackerId = ctx.trigger.attackerPermanentId;
  if (attackerId === undefined) return false;
  const attacker = ctx.game.permanentById(attackerId);
  if (attacker === undefined || attacker.topCard === undefined) return false;
  if (attacker.controllerSeat === source.ownerSeat) return false;
  const level = ctx.game.definitionOf(attacker.topCard).level;
  return level !== undefined && level >= 5;
}

/**
 * The owner's lone breeding-area Digimon, when it is eligible to move to the battle area.
 * Q&A Q2463 (BT14-088): a Digimon without DP (e.g. a level 2 Digimon or a 0-DP DigiEgg
 * card like BT13-007) can't be moved to the battle area — only a card WITH DP (like
 * EX2-007) is a legal target.
 */
function movableBreedingDigimon(ctx: EffectContext, source: CardSource) {
  const bred = ctx.game.player(source.ownerSeat).breeding;
  if (bred === undefined || bred.topCard === undefined) return undefined;
  const dp = ctx.game.definitionOf(bred.topCard).dp;
  if (dp === undefined || dp <= 0) return undefined;
  return bred;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Reveal top 5, add 1 Lv3 Digimon + 1 non-white Tamer, rest to bottom.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 5 cards of your deck. Add 1 level 3 Digimon card and " +
            "1 non-white Tamer card among them to your hand. Place the rest at the bottom of " +
            "your deck in any order.",
          optional: false,
          canActivate: (ctx: any) => {
            return ctx.game.player(source.ownerSeat).deck.length >= 1;
          },
          resolve: async (ctx: any) => {
            const revealed = await ctx.fx.reveal(source.ownerSeat, 5);

            const lv3Digimon = revealed.filter((c: any) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && (def as any).level === 3;
            });
            const nonWhiteTamer = revealed.filter((c: any) =>
              isNonWhiteTamer(ctx.game.definitionOf(c)),
            );

            let selected: string[] = [];

            // Q&A (Q2462): you must add as many cards to your hand as possible — not a
            // free choice of whether to take an eligible card.
            if (lv3Digimon.length > 0) {
              const pick = await ctx.ask.selectCards(ctx, {
                candidates: lv3Digimon.map((c: any) => c.instanceId),
                min: 1,
                max: 1,
              });
              selected = selected.concat(pick);
            }

            if (nonWhiteTamer.length > 0) {
              const pick = await ctx.ask.selectCards(ctx, {
                candidates: nonWhiteTamer.map((c: any) => c.instanceId),
                min: 1,
                max: 1,
              });
              selected = selected.concat(pick);
            }

            if (selected.length > 0) {
              await ctx.fx.returnToHand(selected);
            }

            const rest = revealed
              .filter((c: any) => !selected.includes(c.instanceId))
              .map((c: any) => c.instanceId);

            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest, { toTop: false });
            }
          },
        }),
      ];
    }

    // [Opponent's Turn] When your opponent's level 5 or higher Digimon attacks, by
    // suspending this Tamer, you may move a Digimon from your breeding area to your
    // battle area.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/move-breeding-to-battle`,
          description:
            "[Opponent's Turn] When your opponent's level 5 or higher Digimon attacks, by " +
            "suspending this Tamer, you may move a Digimon from your breeding area to your " +
            "battle area.",
          optional: true,
          when: (ctx) => source.isOnBattleArea() && isOpponentLevel5PlusAttacker(ctx, source),
          canActivate: (ctx) => {
            const self = source.permanent();
            if (self === undefined || self.isSuspended) return false;
            return movableBreedingDigimon(ctx, source) !== undefined;
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined || self.isSuspended) return;
            const bred = movableBreedingDigimon(ctx, source);
            if (bred === undefined) return;
            ctx.fx.suspend([self.permanentId]); // cost: suspend this Tamer
            await ctx.fx.movePermanentZone(bred.permanentId, "toBattle");
          },
        }),
      ];
    }

    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
