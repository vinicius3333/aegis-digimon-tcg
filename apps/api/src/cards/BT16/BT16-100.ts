import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, beforePayCost, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT16-100 — Thunderflame Crusher (BT16, Purple Option).
 *
 *
 *   EffectTiming.None (rule implementation):
 *     If you have a Digimon or Tamer with [Pulsemon] in its text, you may ignore
 *     this card's color requirement.
 *
 *   EffectTiming.BeforePayCost (cost reduction):
 *     When this card would be used, by trashing the top cards of your security stack
 *     until you have 3 left, reduce the use cost by 2 for each card trashed.
 *     Only fires when owner has ≥4 security (otherwise no trashing is possible).
 *     KB Q2697: you CAN trash just 1 card (trash until reaching 3 from 4 → trash 1).
 *
 *   EffectTiming.OptionSkill ([Main]):
 *     Delete 1 of your opponent's level 5 or lower Digimon. Then, if you have 2 or
 *     fewer security cards, place this card at the BOTTOM of your security stack.
 *
 *   EffectTiming.SecuritySkill ([Security]):
 *     1 of your opponent's Digimon gets -15000 DP for the turn.
 */

const cardId = "BT16-100";

function opponentBattleAreaDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(opponent).battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

function hasPulsemonOnField(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const p of owner.battleArea) {
    if (p.topCard === undefined) continue;
    const def = ctx.game.definitionOf(p.topCard);
    const kinds = def.kinds as string[];
    if (!kinds.includes("Digimon") && !kinds.includes("Tamer")) continue;
    if (def.nameEn.includes("Pulsemon")) return true;
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // --- Static: ignore color requirement if you have a Pulsemon Digimon/Tamer ---
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/color-waive-pulsemon`,
          description:
            "If you have a Digimon or Tamer with [Pulsemon] in its text, ignore this card's " +
            "color requirement.",
          when: (ctx) => hasPulsemonOnField(ctx, source),
          resolve: async (ctx) => {
            if (!hasPulsemonOnField(ctx, source)) return;
            // Waive color requirement: reduce cost to 0 when checking color legality.
            // changePlayCost filter scopes to this card's controller playing this card.
            ctx.fx.changePlayCost(
              (facts) => facts.controllerSeat === source.ownerSeat,
              0,
            );
          },
        }),
      ];
    }

    // --- BeforePayCost: trash security down to 3, -2 cost per card trashed ---
    // Loops trashing from top until security.length == 3; playCostDelta += count * 2.
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-security-trash`,
          description:
            "When you would use this card, by trashing the top card(s) of your security " +
            "stack until you have 3 left, reduce the use cost by 2 for each card trashed.",
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).security.length >= 4,
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            let count = 0;
            while (ctx.game.player(ownerSeat).security.length > 3) {
              const trashed = await ctx.fx.trashFromSecurity(ownerSeat, 1, { fromTop: true });
              if (trashed.length === 0) break;
              count++;
            }
            if (count > 0) {
              ctx.playCostDelta = (ctx.playCostDelta ?? 0) + count * 2;
            }
          },
        }),
      ];
    }

    // --- [Main] OptionSkill: delete 1 opp Lv.≤5 Digimon; if ≤2 security, self → security bottom ---
    // CardObjectController.AddSecurityCard(card, toTop: false) → bottom of security.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-delete-lv5-self-to-security`,
          description:
            "[Main] Delete 1 of your opponent's level 5 or lower Digimon. Then, if you have " +
            "2 or fewer security cards, place this card at the bottom of your security stack.",
          optional: false,
          canActivate: (ctx) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            return Array.from(ctx.game.player(oppSeat).battleArea).some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def) && (def.level ?? 99) <= 5;
            });
          },
          resolve: async (ctx) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const candidates = Array.from(ctx.game.player(oppSeat).battleArea).filter((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def) && (def.level ?? 99) <= 5;
            });

            if (candidates.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: candidates.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen[0] !== undefined) {
                await ctx.fx.deletePermanent([chosen[0]]);
              }
            }

            // Then, if you have ≤2 security: place this card at the BOTTOM of your security.
            // The Option card is tracked as source — add its instanceId to security (face-down).
            const ownerSeat = source.ownerSeat;
            if (ctx.game.player(ownerSeat).security.length <= 2) {
              await ctx.fx.addSecurity(ownerSeat, [source.instanceId], {
                toTop: false,
                faceUp: false,
              });
            }
          },
        }),
      ];
    }

    // --- [Security]: -15000 DP to 1 opponent Digimon for the turn ---
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-minus-15000-dp`,
          description:
            "[Security] 1 of your opponent's Digimon gets -15000 DP for the turn.",
          optional: false,
          canActivate: (ctx) => opponentBattleAreaDigimon(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const candidates = opponentBattleAreaDigimon(ctx, source);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: candidates.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen[0] !== undefined) {
              ctx.fx.modifyDP(chosen[0], -15000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
