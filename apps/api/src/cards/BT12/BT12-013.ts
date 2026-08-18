import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-013";
const traits = (def: { types?: string[]; forms?: string[]; attributes?: string[] }): string[] => [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
const module: EffectModule = { cardId, effectsForTiming(timing, source) {
  if (timing === EffectTiming.WhenDigivolving) return [whenDigivolving({ source, effectKey: `${cardId}/digivolve-dp`, description: "[When Digivolving] This Digimon gets +2000 DP for the turn.", resolve: async (ctx) => { const self = source.permanent(); if (self !== undefined) ctx.fx.modifyDP(self.permanentId, 2000, EffectDuration.UntilEachTurnEnd); } })];
  if (timing === EffectTiming.None) return [staticModifier({ source, effectKey: `${cardId}/inherited-trait-dp`, description: "[Your Turn] Hybrid/Ten Warriors host gets +2000 DP.", isInherited: true, when: (ctx) => { const top = source.permanent()?.topCard; if (top === undefined || !source.isOwnersTurn()) return false; const liveTraits = traits(ctx.game.definitionOf(top)); return liveTraits.includes("Hybrid") || liveTraits.includes("Ten Warriors"); }, resolve: async (ctx) => { const host = source.permanent(); if (host !== undefined) ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.Permanent); } })];
  return [];
} };
registerCard(module);
export default module;
