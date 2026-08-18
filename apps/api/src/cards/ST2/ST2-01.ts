import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const sourceLess = (ctx: Parameters<Effect["resolve"]>[0], id: string | undefined): boolean =>
  id !== undefined && ctx.game.permanentById(id)?.stack.length === 0;
const module: EffectModule = {
  cardId: "ST2-01",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnUseAttack)
      return [
        whenAttacking({
          source,
          effectKey: "ST2-01/inherited-attacking",
          isInherited: true,
          description: "Inherited: +1000 DP while battling a sourceless opposing Digimon.",
          when: (ctx) => source.isOwnersTurn() && sourceLess(ctx, ctx.trigger.defenderPermanentId),
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host !== undefined) ctx.fx.modifyDP(host.permanentId, 1000, EffectDuration.UntilEndBattle);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: "ST2-01/inherited-defending",
          isInherited: true,
          description: "Inherited defensive half of the sourceless battle bonus.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host === undefined) return;
            for (const event of ["whenOpponentAttacks", "whenBlocked"] as const)
              ctx.fx.subscribeSubTrigger({
                event,
                sourcePermanentId: host.permanentId,
                once: false,
                description: "ST2-01 inherited battle bonus",
                matches: (subCtx) =>
                  subCtx.trigger.defenderPermanentId === host.permanentId &&
                  sourceLess(subCtx, subCtx.trigger.attackerPermanentId),
                run: async (subCtx) => {
                  subCtx.fx.modifyDP(host.permanentId, 1000, EffectDuration.UntilEndBattle);
                },
              });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
