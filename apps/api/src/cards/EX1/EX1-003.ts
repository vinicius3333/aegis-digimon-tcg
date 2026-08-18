import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX1-003";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.OnAllyAttack) return [];
    return [whenAttacking({
      source,
      effectKey: `${cardId}/delete-on-player-attack`,
      description: "Inherited [When Attacking] When this Digimon attacks a player, delete 1 opposing Digimon with 3000 DP or less.",
      isInherited: true,
      when: (ctx) => {
        const self = source.permanent();
        return self !== undefined && ctx.trigger.attackerPermanentId === self.permanentId && ctx.trigger.targetPermanentId === undefined;
      },
      canActivate: (ctx) => ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.some((p) => isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= 3000),
      resolve: async (ctx) => {
        const opponent = ctx.game.opponentOf(source.ownerSeat);
        const candidates = ctx.game.player(opponent).battleArea.filter((p) => isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= 3000).map((p) => p.permanentId);
        const chosen = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 });
        if (chosen[0] !== undefined) await ctx.fx.deletePermanent([chosen[0]]);
      },
    })];
  },
};

registerCard(module);
export default module;
