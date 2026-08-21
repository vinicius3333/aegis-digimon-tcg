import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT17-040";

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

function ownerBattleAreaDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving]: suspend 1 opponent Digimon + Security A. -1 if Leon Alexander.
    // KB Q2792: SecurityAttack -1 persists until end of opponent's turn, including new arrivals.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-and-security-attack`,
          description:
            "[When Digivolving] Suspend 1 of your opponent's Digimon. If [Leon Alexander] " +
            "is in this Digimon's digivolution cards, all of your opponent's Digimon gain " +
            "<Security A. -1> until the end of their turn.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const candidates = opponentBattleAreaDigimon(ctx, source);
            if (candidates.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: candidates.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen[0] !== undefined) {
                await ctx.fx.suspend([chosen[0]]);
              }
            }

            // If [Leon Alexander] in digivolution stack, all opponent Digimon get Sec A. -1.
            if (hasLeonAlexanderInStack(ctx, source)) {
              for (const p of opponentBattleAreaDigimon(ctx, source)) {
                ctx.fx.grantKeyword(p.permanentId, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -1);
              }
            }
          },
        }),
      ];
    }

    // [End of Your Turn][Once Per Turn]:
    //   If ≥3 security: -6000 DP. If ≤3 security: Recovery +1. Then: optional attack.
    // KB Q2793: at exactly 3 both branches fire.
    // KB Q2794: "then" clause fires regardless of security count after Recovery.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-your-turn-dp-recovery-attack`,
          description:
            "[End of Your Turn][Once Per Turn] If ≥3 security: 1 of your opponent's Digimon " +
            "gets -6000 DP for the turn. If ≤3 security: ＜Recovery +1 (Deck)＞. Then, " +
            "1 of your Digimon may attack an opponent's Digimon.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const securityCount = ctx.game.player(ownerSeat).security.length;

            // Branch 1: ≥3 security → -6000 DP to 1 opponent Digimon.
            if (securityCount >= 3) {
              const candidates = opponentBattleAreaDigimon(ctx, source);
              if (candidates.length > 0) {
                const byTopCard = new Map<string, Permanent>(candidates.map((p) => [p.topCard!.instanceId, p]));
                const chosen = await ctx.ask.chooseTargets(ctx, {
                  candidates: Array.from(byTopCard.keys()),
                  min: 1,
                  max: 1,
                });
                const chosenPerm = chosen[0] !== undefined ? byTopCard.get(chosen[0]) : undefined;
                if (chosenPerm !== undefined) {
                  ctx.fx.modifyDP(chosenPerm.permanentId, -6000, EffectDuration.UntilEachTurnEnd);
                }
              }
            }

            // Branch 2: ≤3 security → Recovery +1 (Deck).
            if (securityCount <= 3) {
              await ctx.fx.recoverToSecurity(ownerSeat, 1);
            }

            // Then: 1 of your Digimon may attack an opponent's Digimon (KB Q2794: always runs).
            const attackCandidates = ownerBattleAreaDigimon(ctx, source).filter((p) => !p.isSuspended);
            if (attackCandidates.length > 0) {
              const wantToAttack = await ctx.ask.optional(ctx, "1 of your Digimon may attack an opponent's Digimon.");
              if (wantToAttack) {
                const chosen = await ctx.ask.chooseTargets(ctx, {
                  candidates: attackCandidates.map((p) => p.permanentId),
                  min: 1,
                  max: 1,
                });
                if (chosen[0] !== undefined) {
                  await ctx.fx.forceAttack(chosen[0]);
                }
              }
            }
          },
        }),
      ];
    }

    // [Inherited][Once Per Turn] When a card is removed from your security stack, if
    // this Digimon has [Fenriloogamon] in its name, 1 of your opponent's Digimon gets
    // -8000 DP for the turn.
    if (timing === EffectTiming.OnLoseSecurity) {
      return [
        {
          effectKey: `${cardId}/inherited-security-loss-fenriloogamon-minus-8000`,
          description:
            "[Inherited][Once Per Turn] When a card is removed from your security stack, " +
            "if this Digimon has [Fenriloogamon] in its name, 1 of your opponent's Digimon " +
            "gets -8000 DP for the turn.",
          optional: false,
          isInherited: true,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: 1,
          canTrigger: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            // loses a card. Security is removed during the OPPONENT's attack, so this fires on
            // the opponent's turn. (TriggerInfo has no securityLostSeat field — use !isOwnersTurn
            // as the proxy, which correctly matches when the opponent attacks this player.)
            return !ctx.source.isOwnersTurn();
          },
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (self?.topCard === undefined) return false;
            if (!ctx.game.definitionOf(self.topCard).nameEn.includes("Fenriloogamon")) return false;
            return opponentBattleAreaDigimon(ctx, source).length >= 1;
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self?.topCard === undefined) return;
            if (!ctx.game.definitionOf(self.topCard).nameEn.includes("Fenriloogamon")) return;
            const candidates = opponentBattleAreaDigimon(ctx, source);
            if (candidates.length === 0) return;
            const byTopCard = new Map<string, Permanent>(candidates.map((p) => [p.topCard!.instanceId, p]));
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: Array.from(byTopCard.keys()),
              min: 1,
              max: 1,
            });
            const chosenPerm = chosen[0] !== undefined ? byTopCard.get(chosen[0]) : undefined;
            if (chosenPerm !== undefined) {
              ctx.fx.modifyDP(chosenPerm.permanentId, -8000, EffectDuration.UntilEachTurnEnd);
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
