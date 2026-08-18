import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-019";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.None) return [
      staticModifier({ source, effectKey: `${cardId}/keywords`, description: "Rush; Material Save 4.", resolve: async (ctx) => { const self = source.permanent(); if (!self) return; ctx.fx.grantKeyword(self.permanentId, "Rush", EffectDuration.Permanent); ctx.fx.grantKeyword(self.permanentId, "MaterialSave", EffectDuration.Permanent, 4); } }),
      staticModifier({ source, effectKey: `${cardId}/stack-dp`, description: "[All Turns] +1000 DP per 2 digivolution cards.", resolve: async (ctx) => { const self = source.permanent(); if (!self) return; const bonus = Math.floor(self.stack.length / 2) * 1000; if (bonus) ctx.fx.modifyDP(self.permanentId, bonus, EffectDuration.Permanent); } }),
    ];
    if (timing === EffectTiming.OnPlay) return [onPlay({
      source, effectKey: `${cardId}/delete`, description: "[On Play] Delete an opposing Digimon with DP no greater than this Digimon.",
      canActivate: (ctx) => { const self = source.permanent(); return !!self && ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.some((p) => p.topCard && ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon) && p.currentDP <= self.currentDP); },
      resolve: async (ctx) => { const self = source.permanent(); if (!self) return; const candidates = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((p) => p.topCard && ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon) && p.currentDP <= self.currentDP).map(({ permanentId }) => permanentId); const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }); await ctx.fx.deletePermanent(chosen, "byEffect"); },
    })];
    return [];
  },
};
registerCard(module);
export default module;
