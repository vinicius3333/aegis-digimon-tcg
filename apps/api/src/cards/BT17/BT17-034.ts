import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT17-034";

function hasLeonAlexanderInStack(ctx: EffectContext, source: CardSource): boolean {
  const self = source.permanent();
  if (self === undefined) return false;
  return self.stack.some((card) => ctx.game.definitionOf(card).nameEn === "Leon Alexander");
}

function opponentBattleAreaDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(opponent).battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving]: dual-branch at security threshold 3.
    // KB Q2784: at exactly 3, BOTH -3000 DP AND suspend fire.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-dp-and-suspend`,
          description:
            "[When Digivolving] If ≥3 security: 1 of your opponent's Digimon gets -3000 DP " +
            "for the turn. If ≤3 security: suspend 1 of your opponent's Digimon.",
          optional: false,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const ownerSecurity = ctx.game.player(source.ownerSeat).security.length;
            const hasTargets = opponentBattleAreaDigimon(ctx, source).length >= 1;
            return (ownerSecurity >= 3 || ownerSecurity <= 3) && hasTargets;
          },
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const securityCount = ctx.game.player(ownerSeat).security.length;
            const candidates = opponentBattleAreaDigimon(ctx, source);
            if (candidates.length === 0) return;

            const byTopCard = new Map<string, Permanent>(candidates.map((p) => [p.topCard!.instanceId, p]));

            // Branch 1: ≥3 security → -3000 DP to 1 opponent Digimon.
            if (securityCount >= 3) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: Array.from(byTopCard.keys()),
                min: 1,
                max: 1,
              });
              const chosenPerm = chosen[0] !== undefined ? byTopCard.get(chosen[0]) : undefined;
              if (chosenPerm !== undefined) {
                ctx.fx.modifyDP(chosenPerm.permanentId, -3000, EffectDuration.UntilEachTurnEnd);
              }
            }

            // Branch 2: ≤3 security → suspend 1 opponent Digimon.
            // Refresh byTopCard in case the board changed.
            const candidatesAfter = opponentBattleAreaDigimon(ctx, source);
            if (securityCount <= 3 && candidatesAfter.length > 0) {
              const byTopCardAfter = new Map<string, Permanent>(candidatesAfter.map((p) => [p.topCard!.instanceId, p]));
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: Array.from(byTopCardAfter.keys()),
                min: 1,
                max: 1,
              });
              const chosenPerm = chosen[0] !== undefined ? byTopCardAfter.get(chosen[0]) : undefined;
              if (chosenPerm !== undefined) {
                await ctx.fx.suspend([chosenPerm.permanentId]);
              }
            }
          },
        }),
      ];
    }

    // [All Turns][Once Per Turn] When a card is trashed from your security stack, if
    // [Leon Alexander] is in this Digimon's digivolution cards, ＜Recovery +1＞.
    //
    // RESIDUAL: flat OnDiscardSecurity fires only when THIS card is trashed from security,
    // not when any other security card is trashed. The SubTrigger bus for
    // whenCardTrashedFromSecurity is inert (no engine callers). We implement here what the
    // engine CAN deliver; the rest is residual.
    if (timing === EffectTiming.OnDiscardSecurity) {
      return [
        {
          effectKey: `${cardId}/security-trashed-recovery`,
          description:
            "[All Turns][Once Per Turn] When a card is trashed from your security stack, if " +
            "[Leon Alexander] is in this Digimon's digivolution cards, ＜Recovery +1＞.",
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: 1,
          canTrigger: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return true;
          },
          canActivate: (ctx) => hasLeonAlexanderInStack(ctx, source),
          resolve: async (ctx) => {
            if (!hasLeonAlexanderInStack(ctx, source)) return;
            await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
          },
        },
      ];
    }

    // [Inherited] This Digimon gets +1000 DP while its top card has [Pulsemon] in its text.
    // Condition: TopCard.HasPulsemonText (i.e. contains "Pulsemon").
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-pulsemon-plus-1000dp`,
          description: "[Inherited] While this Digimon's top card has [Pulsemon] in its text, it gets +1000 DP.",
          isInherited: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (self?.topCard === undefined) return false;
            return ctx.game.definitionOf(self.topCard).nameEn.includes("Pulsemon");
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined || self.topCard === undefined) return;
            if (!ctx.game.definitionOf(self.topCard).nameEn.includes("Pulsemon")) return;
            ctx.fx.modifyDP(self.permanentId, 1000, EffectDuration.Permanent);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
