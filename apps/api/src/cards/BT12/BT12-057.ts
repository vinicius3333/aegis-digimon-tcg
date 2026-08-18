import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-057";
function digimonOrTamerIds(ctx: EffectContext): string[] {
  const ids: string[] = [];
  for (const player of ctx.game.state.players)
    for (const permanent of player.battleArea) {
      if (
        permanent.topCard !== undefined &&
        (isDigimon(ctx.game.definitionOf(permanent.topCard)) || isTamer(ctx.game.definitionOf(permanent.topCard)))
      )
        ids.push(permanent.permanentId);
    }
  return ids;
}
function suspendedCount(ctx: EffectContext): number {
  let count = 0;
  for (const player of ctx.game.state.players)
    for (const permanent of player.battleArea) {
      if (
        permanent.isSuspended &&
        permanent.topCard !== undefined &&
        (isDigimon(ctx.game.definitionOf(permanent.topCard)) || isTamer(ctx.game.definitionOf(permanent.topCard)))
      )
        count += 1;
    }
  return count;
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/suspend-all`,
          description:
            "Suspend all other Digimon and all Tamers, then gain 1 memory per 2 suspended Digimon and Tamers.",
          resolve: async (ctx) => {
            const selfId = source.permanent()?.permanentId;
            await ctx.fx.suspend(
              digimonOrTamerIds(ctx).filter((id) => id !== selfId),
              { byEffectSeat: source.ownerSeat },
            );
            ctx.fx.gainMemory(Math.floor(suspendedCount(ctx) / 2));
          },
        }),
      ];
    if (timing === EffectTiming.OnAllyAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/attack-suspend-security`,
          description: "Suspend an opposing Digimon or Tamer, then trash security per 5 suspended Digimon and Tamers.",
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const candidates = ctx.game
              .player(opponent)
              .battleArea.filter(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  (isDigimon(ctx.game.definitionOf(permanent.topCard)) ||
                    isTamer(ctx.game.definitionOf(permanent.topCard))),
              )
              .map(({ permanentId }) => permanentId);
            if (candidates.length) {
              const [picked] = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
              if (picked) await ctx.fx.suspend([picked], { byEffectSeat: source.ownerSeat });
            }
            const count = Math.floor(suspendedCount(ctx) / 5);
            if (count > 0) await ctx.fx.trashFromSecurity(opponent, count, { fromTop: true });
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/no-unsuspend`,
          description: "[All Turns] Other Digimon and Tamers don't unsuspend.",
          resolve: async (ctx) => {
            const selfId = source.permanent()?.permanentId;
            for (const id of digimonOrTamerIds(ctx))
              if (id !== selfId) ctx.fx.restrict(id, "unsuspend", EffectDuration.Permanent, { continuous: true });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
