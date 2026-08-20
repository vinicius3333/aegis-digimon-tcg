import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, turnTiming, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-092 — Shota Kuroi (BT26, Black Tamer, TS).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-092 as of this port
// (`node tools/kb/query.mjs card BT26-092` against the refreshed knowledge base returned no
// entries). Implemented from the printed card text only.
//
// [Start of Your Main Phase] By trashing 1 [TS] trait card from your hand, ＜Draw 1＞ and gain
//   1 memory.
// [Opponent's Turn] When one of your opponent's Digimon attacks, by returning 1 of your [TS]
//   trait Tamers to the bottom of the deck, you may change the attack target to 1 of your
//   Digimon with the [TS] trait.
//
// Clause 1 is BT26-089/BT26-091/BT26-093's start-of-main cost-then-benefit shape, gated to the
//   controller's own main phase (OnStartMainPhase fires board-wide).
// Clause 2 observes the OPPONENT's attack: RB1-033's `whenAttacking({ attackScope: "opponent" })`
//   at the board-wide `OnAllyAttack` window, plus an `[Opponent's Turn]` gate. The redirect is
//   `redirectAttack(candidates, { optional: true })` — EX12-028's mapping of the same printed
//   "change the attack target to 1 of your [trait] Digimon" clause. The cost is paid first and
//   the redirect stays optional ("you may"), so a paid cost with a declined redirect is legal.
//   "1 of your [TS] trait Tamers" includes THIS Tamer: the printed text puts no exception on it.

const cardId = "BT26-092";
const TS_TRAIT = "TS";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;
const isTamer = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Tamer) === true;
const hasTsTrait = (def: CardDefinition): boolean => (def.types ?? []).includes(TS_TRAIT);

function tsCardsInHand(ctx: EffectContext, ownerSeat: Seat): string[] {
  return Array.from(ctx.game.player(ownerSeat).hand)
    .filter((card) => hasTsTrait(ctx.game.definitionOf(card)))
    .map((card) => card.instanceId);
}

/** The controller's own [TS] trait Tamers, addressed by their TOP-CARD instance id. */
function tsTamerTopCards(ctx: EffectContext, ownerSeat: Seat): string[] {
  return Array.from(ctx.game.player(ownerSeat).battleArea)
    .filter((permanent) => {
      if (permanent.inBreeding || permanent.topCard === undefined) return false;
      const def = ctx.game.definitionOf(permanent.topCard);
      return isTamer(def) && hasTsTrait(def);
    })
    .map((permanent) => permanent.topCard!.instanceId);
}

function tsDigimonTargets(ctx: EffectContext, ownerSeat: Seat): string[] {
  return Array.from(ctx.game.player(ownerSeat).battleArea)
    .filter((permanent) => {
      if (permanent.inBreeding || permanent.topCard === undefined) return false;
      const def = ctx.game.definitionOf(permanent.topCard);
      return isDigimon(def) && hasTsTrait(def);
    })
    .map((permanent) => permanent.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-trash-ts-draw-memory`,
          description:
            "[Start of Your Main Phase] By trashing 1 [TS] trait card from your hand, " +
            "＜Draw 1＞ and gain 1 memory.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => tsCardsInHand(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            const candidates = tsCardsInHand(ctx, source.ownerSeat);
            if (candidates.length === 0) return;

            const toTrash = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (toTrash.length === 0) return;

            await ctx.fx.trash(toTrash, { byEffectSeat: source.ownerSeat });
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/opponent-attack-redirect-to-ts-digimon`,
          description:
            "[Opponent's Turn] When one of your opponent's Digimon attacks, by returning 1 of " +
            "your [TS] trait Tamers to the bottom of the deck, you may change the attack target " +
            "to 1 of your Digimon with the [TS] trait.",
          optional: true,
          attackScope: "opponent",
          when: (ctx) => ctx.source.isOnBattleArea() && !ctx.source.isOwnersTurn(),
          canActivate: (ctx) => tsTamerTopCards(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            const costCandidates = tsTamerTopCards(ctx, source.ownerSeat);
            if (costCandidates.length === 0) return;

            const toReturn = await ctx.ask.selectCards(ctx, { candidates: costCandidates, min: 0, max: 1 });
            if (toReturn.length === 0) return;

            await ctx.fx.returnToDeck(toReturn, { toTop: false });

            const targets = tsDigimonTargets(ctx, source.ownerSeat);
            if (targets.length === 0) return;

            await ctx.fx.redirectAttack(targets, { optional: true });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
