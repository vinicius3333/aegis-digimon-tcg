import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-073";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/buff`,
          optional: true,
          description: "Return a non-Accel-Arm level 6 source to gain Security Attack +1 and Piercing.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const candidates = self.stack
              .filter((card) => {
                const def = ctx.game.definitionOf(card);
                return isDigimon(def) && def.level === 6 && !def.nameEn.includes("Justimon: Accel Arm");
              })
              .map(({ instanceId }) => instanceId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;
            await ctx.fx.returnToHand(chosen);
            ctx.fx.grantKeyword(self.permanentId, "SecurityAttack+1", EffectDuration.UntilEachTurnEnd);
            ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    if (timing === EffectTiming.OnUseAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/attack-digivolve`,
          optional: true,
          description: "With a Tamer, digivolve into another Justimon from hand for cost 2.",
          when: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some((p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard))),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const candidates = ctx.game
              .player(source.ownerSeat)
              .hand.filter((card) => {
                const def = ctx.game.definitionOf(card);
                return isDigimon(def) && def.nameEn.includes("Justimon") && !def.nameEn.includes("Justimon: Accel Arm");
              })
              .map(({ instanceId }) => instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen[0] !== undefined)
              await ctx.fx.digivolveFromInstance(self.permanentId, chosen[0], {
                payCost: true,
                costOverride: 2,
                ignoreRequirements: true,
              });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
