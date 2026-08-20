import { EffectDuration, EffectTiming, CardKind, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT13-060";

const isDigimonOrTamer = (game: GameAccess, p: Permanent): boolean => {
  if (p.topCard === undefined) return false;
  const def = game.definitionOf(p.topCard);
  const kinds = def.kinds as string[];
  return kinds.includes(CardKind.Digimon as string) || kinds.includes(CardKind.Tamer as string);
};

const opponentDigimonPermanents = (game: GameAccess, source: CardSource): Permanent[] => {
  const opp = game.opponentOf(source.ownerSeat);
  const result: Permanent[] = [];
  for (const p of game.player(opp).battleArea as Iterable<Permanent>) {
    if (p.topCard === undefined) continue;
    if (isDigimon(game.definitionOf(p.topCard))) result.push(p);
  }
  return result;
};

const opponentTamerPermanents = (game: GameAccess, source: CardSource): Permanent[] => {
  const opp = game.opponentOf(source.ownerSeat);
  const result: Permanent[] = [];
  for (const p of game.player(opp).battleArea as Iterable<Permanent>) {
    if (p.topCard === undefined) continue;
    const def = game.definitionOf(p.topCard);
    if ((def.kinds as string[]).includes(CardKind.Tamer as string)) result.push(p);
  }
  return result;
};

/** Count opponent's suspended Digimon and Tamers. */
const opponentSuspendedCount = (game: GameAccess, source: CardSource): number => {
  const opp = game.opponentOf(source.ownerSeat);
  let count = 0;
  for (const p of game.player(opp).battleArea as Iterable<Permanent>) {
    if (p.isSuspended && isDigimonOrTamer(game, p)) count++;
  }
  return count;
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Suspend 1 of your opponent's Digimon and 1 of their Tamers. Until the
    // end of your opponent's turn, all of their Digimon and Tamers don't unsuspend.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-restrict`,
          description:
            "[When Digivolving] Suspend 1 of your opponent's Digimon and 1 of their Tamers. " +
            "Until the end of your opponent's turn, all of their Digimon and Tamers don't unsuspend.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            // Suspend 1 opponent Digimon.
            const digimonTargets = opponentDigimonPermanents(ctx.game, source);
            if (digimonTargets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: digimonTargets.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.suspend(chosen);
              }
            }

            // Suspend 1 opponent Tamer.
            const tamerTargets = opponentTamerPermanents(ctx.game, source);
            if (tamerTargets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: tamerTargets.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.suspend(chosen);
              }
            }

            // All opponent Digimon and Tamers can't unsuspend until end of their turn.
            const opp = ctx.game.opponentOf(source.ownerSeat);
            for (const p of ctx.game.player(opp).battleArea as Iterable<Permanent>) {
              if (!isDigimonOrTamer(ctx.game, p)) continue;
              ctx.fx.restrict(
                p.permanentId,
                "unsuspend",
                EffectDuration.UntilOpponentTurnEnd,
              );
            }
          },
        }),
      ];
    }

    // [When Attacking] Trash the top card of your opponent's security stack for every 2 of your
    // opponent's suspended Digimon and Tamers.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-trash-security-per-suspended`,
          description:
            "[When Attacking] Trash the top card of your opponent's security stack for every 2 of " +
            "your opponent's suspended Digimon and Tamers.",
          optional: false,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return Math.floor(opponentSuspendedCount(ctx.game, source) / 2) >= 1;
          },
          resolve: async (ctx) => {
            const trashCount = Math.floor(opponentSuspendedCount(ctx.game, source) / 2);
            if (trashCount <= 0) return;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            await ctx.fx.trashFromSecurity(opponent, trashCount, { fromTop: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
