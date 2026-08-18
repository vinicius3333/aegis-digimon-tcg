import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST4-01";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [staticModifier({ source, effectKey: `${cardId}/level-six-dp`, description: "[Your Turn] Level 6 host gets +1000 DP.", isInherited: true, when: (ctx) => { const self = source.permanent(); return source.isOwnersTurn() && self?.topCard !== undefined && isDigimon(ctx.game.definitionOf(self.topCard)) && (ctx.game.definitionOf(self.topCard).level ?? 0) >= 6; }, resolve: async (ctx) => { const self = source.permanent(); if (self) ctx.fx.modifyDP(self.permanentId, 1000, EffectDuration.UntilEachTurnEnd, { continuous: true }); } })];
  },
};
registerCard(module);
export default module;
