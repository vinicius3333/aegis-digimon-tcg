import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX1-010";
const module: EffectModule = { cardId, effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
  if (timing === EffectTiming.None) return [staticModifier({ source, effectKey: `${cardId}/security-attack-plus-1`, description: "Security Attack +1", resolve: async (ctx) => { const self = source.permanent(); if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1); } })];
  if (timing === EffectTiming.OnAllyAttack) return [whenAttacking({ source, effectKey: `${cardId}/draw-2-on-player-attack`, description: "[When Attacking] When this Digimon attacks a player, draw 2.", when: (ctx) => { const self = source.permanent(); return self !== undefined && ctx.trigger.attackerPermanentId === self.permanentId && ctx.trigger.targetPermanentId === undefined; }, resolve: async (ctx) => { await ctx.fx.draw(source.ownerSeat, 2); } })];
  return [];
} };
registerCard(module);
export default module;
