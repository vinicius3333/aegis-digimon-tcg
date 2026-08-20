import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, whenAttacking, turnTiming, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "RB1-025";

function hasAngoramon(def: CardDefinition): boolean {
  return def.nameEn.includes("Angoramon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞ (when digivolving/attacking)",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Suspend 1 of your opponent's Digimon. If your opponent has no " +
            "unsuspended Digimon, gain 1 memory.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const unsuspended = Array.from(opp.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && !p.isSuspended)
              .map((p) => p.permanentId);
            if (unsuspended.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: unsuspended, min: 1, max: 1 });
              if (chosen.length > 0) {
                ctx.fx.suspend([chosen[0]!]);
              }
            }
            const remaining = Array.from(opp.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && !p.isSuspended);
            if (remaining.length === 0) {
              // [When Digivolving] can be reached via an effect-driven (reactive) digivolve
              // on the opponent's turn -- credit this card's controller explicitly.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking`,
          description:
            "[When Attacking] Suspend 1 of your opponent's Digimon. If your opponent has no " +
            "unsuspended Digimon, gain 1 memory.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const unsuspended = Array.from(opp.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && !p.isSuspended)
              .map((p) => p.permanentId);
            if (unsuspended.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: unsuspended, min: 1, max: 1 });
              if (chosen.length > 0) {
                ctx.fx.suspend([chosen[0]!]);
              }
            }
            const remaining = Array.from(opp.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && !p.isSuspended);
            if (remaining.length === 0) {
              ctx.fx.gainMemory(1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn`,
          description:
            "[End of Your Turn] You may attack 1 of your opponent's Digimon with 1 of your " +
            "[Angoramon] in name Digimon.",
          optional: true,
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const attackers = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && hasAngoramon(ctx.game.definitionOf(p.topCard)) && !p.isSuspended)
              .map((p) => p.permanentId);
            if (attackers.length === 0) return;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const defenders = Array.from(opp.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (defenders.length === 0) return;
            const attacker = await ctx.ask.chooseTargets(ctx, {
              candidates: attackers,
              min: 1,
              max: 1,
            });
            if (attacker.length === 0) return;
            const defender = await ctx.ask.chooseTargets(ctx, {
              candidates: defenders,
              min: 1,
              max: 1,
            });
            if (defender.length > 0 && ctx.fx.forceBattle) {
              await ctx.fx.forceBattle(attacker[0]!, defender[0]!);
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
