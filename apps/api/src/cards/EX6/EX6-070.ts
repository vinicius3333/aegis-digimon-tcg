import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-070";

function hasLilithmon(def: CardDefinition): boolean {
  return def.nameEn.toLowerCase().includes("lilithmon");
}

function ownerHasLilithmon(ctx: EffectContext, ownerSeat: Seat): boolean {
  const player = ctx.game.player(ownerSeat);
  return Array.from(player.battleArea).some((p) => {
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) && hasLilithmon(def);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Grant 1 opponent Digimon "[End of Your Turn] Delete this Digimon" until
    // end of opponent's turn. Then place this card in the battle area.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-grant-delete-and-place`,
          description:
            "[Main] Until the end of your opponent's turn, 1 of their Digimon gains " +
            '"[End of Your Turn] Delete this Digimon." Then, place this card in the battle area.',
          optional: false,
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opponentPlayer = ctx.game.player(opponent);
            const opponentDigimon = Array.from(opponentPlayer.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);

            if (opponentDigimon.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: opponentDigimon,
                min: 1,
                max: 1,
              });

              if (chosen.length > 0) {
                const targetId = chosen[0]!;
                // Grant the selected Digimon a sub-trigger that fires at end of its controller's
                // turn (= end of opponent's turn) and deletes it.
                ctx.fx.subscribeSubTrigger({
                  event: "endOfOpponentTurn",
                  sourcePermanentId: targetId,
                  once: true,
                  expiresOnTurnEndOf: opponent,
                  description: `${cardId}: delete granted opponent Digimon at end of their turn`,
                  matches: (subCtx) => {
                    const perm = subCtx.game.permanentById(targetId);
                    if (perm === undefined || perm.topCard === undefined) return false;
                    // KB Q4255: if moved to breeding, can't activate.
                    return perm.controllerSeat === opponent && !perm.inBreeding;
                  },
                  run: async (subCtx) => {
                    const perm = subCtx.game.permanentById(targetId);
                    if (perm === undefined || perm.inBreeding) return;
                    await subCtx.fx.deletePermanent([targetId]);
                  },
                });
              }
            }

            // Place this card (Option) in the battle area.
            await ctx.fx.placeOptionAsPermanent?.(ctx.source.instanceId);
          },
        }),
      ];
    }

    // [End of Opponent's Turn] ＜Delay＞: if you have a [Lilithmon] Digimon, delete this
    // battle-area Option (cost), then delete 1 of your opponent's unsuspended Digimon.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-opponent-turn-delay-lilithmon`,
          description:
            "[End of Opponent's Turn] ＜Delay＞ If you have a Digimon with [Lilithmon] in its " +
            "name, delete this Digimon, then delete 1 of your opponent's unsuspended Digimon.",
          when: (ctx) => {
            if (ctx.source.isOwnersTurn()) return false;
            if (!ctx.source.isOnBattleArea()) return false;
            return ownerHasLilithmon(ctx, source.ownerSeat);
          },
          resolve: async (ctx) => {
            if (!ownerHasLilithmon(ctx, source.ownerSeat)) return;

            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            // Delete self as the activation cost.
            const deleted = await ctx.fx.deletePermanent([selfPerm.permanentId]);
            if (deleted === 0) return;

            // Then delete 1 of opponent's unsuspended Digimon.
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opponentPlayer = ctx.game.player(opponent);
            const candidates = Array.from(opponentPlayer.battleArea)
              .filter((p) => {
                if (p.topCard === undefined || p.isSuspended) return false;
                return isDigimon(ctx.game.definitionOf(p.topCard));
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;

            await ctx.fx.deletePermanent(chosen);
          },
        }),
      ];
    }

    // [Security] Delete 1 of your opponent's unsuspended Digimon.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-delete-unsuspended`,
          description: "[Security] Delete 1 of your opponent's unsuspended Digimon.",
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opponentPlayer = ctx.game.player(opponent);
            const candidates = Array.from(opponentPlayer.battleArea)
              .filter((p) => {
                if (p.topCard === undefined || p.isSuspended) return false;
                return isDigimon(ctx.game.definitionOf(p.topCard));
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;

            await ctx.fx.deletePermanent(chosen);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
