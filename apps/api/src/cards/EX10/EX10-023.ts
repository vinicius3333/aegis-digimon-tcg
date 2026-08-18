import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "EX10-023";

/** Suspend all Digimon and Tamers on both sides, except self. */
async function suspendAllOthers(ctx: Parameters<Effect["resolve"]>[0]): Promise<void> {
  if (!ctx.source.isOnBattleArea()) return;
  const self = ctx.source.permanent();
  const selfId = self?.permanentId;

  const toSuspend: string[] = [];
  for (const player of [ctx.game.player(0 as 0 | 1), ctx.game.player(1 as 0 | 1)]) {
    for (const perm of player.battleArea) {
      if (perm.permanentId === selfId) continue;
      if (perm.topCard === undefined) continue;
      const def = ctx.game.definitionOf(perm.topCard);
      const kinds = def.kinds as string[];
      if (!kinds.includes("Digimon") && !kinds.includes("Tamer")) continue;
      toSuspend.push(perm.permanentId);
    }
  }
  if (toSuspend.length > 0) {
    await ctx.fx.suspend(toSuspend);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Suspend all other Digimon and Tamers on both sides.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-all-others`,
          description: "[On Play] Suspend all other Digimon and Tamers.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: suspendAllOthers,
        }),
      ];
    }

    // [When Digivolving] Suspend all others + [once per turn] delete 1 suspended opponent Digimon.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-all-others`,
          description: "[When Digivolving] Suspend all other Digimon and Tamers.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: suspendAllOthers,
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/shared-delete-suspended`,
          description: "[When Digivolving] Delete 1 of your opponent's suspended Digimon.",
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            return ctx.game.player(opponentSeat).battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              return p.isSuspended && isDigimon(ctx.game.definitionOf(p.topCard));
            });
          },
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const candidates = ctx.game
              .player(opponentSeat)
              .battleArea.filter((p) => {
                if (p.topCard === undefined) return false;
                return p.isSuspended && isDigimon(ctx.game.definitionOf(p.topCard));
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.deletePermanent(chosen);
            }
          },
        }),
      ];
    }

    // [When Attacking] Delete 1 of your opponent's suspended Digimon (shared once-per-turn with WD).
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/shared-delete-suspended`,
          description: "[When Attacking] Delete 1 of your opponent's suspended Digimon.",
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            return ctx.game.player(opponentSeat).battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              return p.isSuspended && isDigimon(ctx.game.definitionOf(p.topCard));
            });
          },
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const candidates = ctx.game
              .player(opponentSeat)
              .battleArea.filter((p) => {
                if (p.topCard === undefined) return false;
                return p.isSuspended && isDigimon(ctx.game.definitionOf(p.topCard));
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.deletePermanent(chosen);
            }
          },
        }),
      ];
    }

    // [All Turns] Other than this Digimon, no Digimon or Tamers can unsuspend.
    // staticModifier re-applied each pass; restrict("unsuspend", UntilEachTurnEnd) on each
    // eligible permanent blocks unsuspend phases for all non-self battle-area Digimon/Tamers.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/cant-unsuspend-others`,
          description:
            "[All Turns] Other than this Digimon, no Digimon or Tamers can unsuspend " +
            "in the unsuspend phase.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            const selfId = self?.permanentId;

            for (const player of [ctx.game.player(0 as 0 | 1), ctx.game.player(1 as 0 | 1)]) {
              for (const perm of player.battleArea) {
                if (perm.permanentId === selfId) continue;
                if (perm.topCard === undefined) continue;
                const def = ctx.game.definitionOf(perm.topCard);
                const kinds = def.kinds as string[];
                if (!kinds.includes("Digimon") && !kinds.includes("Tamer")) continue;
                ctx.fx.restrict(perm.permanentId, "unsuspend", EffectDuration.UntilEachTurnEnd);
              }
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
