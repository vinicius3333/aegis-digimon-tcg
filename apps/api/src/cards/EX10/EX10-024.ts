import { CardKind, EffectTiming, type Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX10-024";

/**
 * EX10-024 — Kabemon (EX10 Black Digimon).
 *
 * 1. [None] Alternate Digivolution: Appmon Lv.2 -> 0 cost
 * 2. [None] Link Condition: Appmon trait, cost 1
 * 3. [Main] Link Effect registration
 * 4. [Security] Play after battle
 * 5. [When Attacking] [Linked]: by trashing 1 link card, <De-Digivolve 1> opponent Digimon
 */

function opponentDigimonIds(ctx: EffectContext): string[] {
  const oppSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
  const opp = ctx.game.player(oppSeat);
  return opp.battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      return ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon);
    })
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [None] Digivolution requirement + Link condition are expressed via card data
    // (digivolutionRequirement / linkRequirement in the card JSON)

    // [When Attacking] [Linked]: by trashing 1 link card, De-Digivolve 1 opp Digimon
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-link-trash-de-digivolve`,
          description:
            "[When Attacking] By trashing 1 of this Digimon's link cards, " +
            "<De-Digivolve 1> 1 of your opponent's Digimon.",
          isLinked: true, // documented behavior IsLinkedEffect:true
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            // Must be the linked card's source being attacked
            return true;
          },
          canActivate: (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return false;
            return selfPerm.linked.length > 0;
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const linkedIds = selfPerm.linked.map((c) => c.instanceId);
            if (linkedIds.length === 0) return;

            const wantToPay = await ctx.ask.optional(
              ctx,
              "Trash 1 link card to <De-Digivolve 1> opponent's Digimon?",
            );
            if (!wantToPay) return;

            let chosenLinkId: string;
            if (linkedIds.length === 1) {
              chosenLinkId = linkedIds[0]!;
            } else {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: linkedIds,
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              chosenLinkId = chosen[0]!;
            }

            // Trash the link card
            await ctx.fx.trash([chosenLinkId]);

            // Select 1 opponent Digimon to De-Digivolve
            const oppIds = opponentDigimonIds(ctx);
            if (oppIds.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: oppIds,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            ctx.fx.deDigivolve(chosen[0]!, 1, { byEffectSeat: ctx.source.ownerSeat });
          },
        }),
      ];
    }

    // [Security] Play this card after battle
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
