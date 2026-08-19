import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-014";
export const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/dynamic-delete-budget`,
          description: "[When Digivolving] Delete opposing Digimon totaling 4000 DP, +3000 per 2 sources.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const budget = 4000 + 3000 * Math.floor(self.stack.length / 2);
            const candidates = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
            if (candidates.length === 0) return;
            const byId = new Map(candidates.map((p) => [p.permanentId, p]));
            const chosen = await ctx.ask.selectPermanents(ctx, {
              candidates: [...byId.keys()],
              min: 0,
              max: candidates.length,
            });
            const accepted: string[] = [];
            let used = 0;
            for (const id of chosen) {
              const target = byId.get(id);
              if (target !== undefined && used + target.currentDP <= budget) {
                accepted.push(id);
                used += target.currentDP;
              }
            }
            if (accepted.length > 0) await ctx.fx.deletePermanent(accepted);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-attack`,
          description: "[Your Turn] With 4+ digivolution cards, gain Security Attack +1.",
          when: () => source.isOwnersTurn() && (source.permanent()?.stack.length ?? 0) >= 4,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined)
              ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
          },
        }),
      ];
    if (timing === EffectTiming.OnUseAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-save-delete`,
          description:
            "[When Attacking][Once Per Turn] If the host has Save, delete an opposing 4000 DP or less Digimon.",
          isInherited: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            const top = source.permanent()?.topCard;
            if (top === undefined) return false;
            const def = ctx.game.definitionOf(top);
            return `${def.effectText ?? ""}${def.inheritedEffectText ?? ""}`.includes("Save");
          },
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter(
                (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= 4000,
              )
              .map((p) => p.permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length > 0) await ctx.fx.deletePermanent(chosen);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
