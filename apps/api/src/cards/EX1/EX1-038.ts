import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX1-038";
const module: EffectModule = { cardId, effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
  if (timing !== EffectTiming.None) return [];
  return [
    staticModifier({ source, effectKey: `${cardId}/piercing`, description: "Piercing", resolve: async (ctx) => { const self = source.permanent(); if (self !== undefined) ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEachTurnEnd); } }),
    staticModifier({ source, effectKey: `${cardId}/inherited-piercing`, description: "Inherited [Your Turn] Piercing while Imperialdramon or Free.", isInherited: true, when: (ctx) => { if (!source.isOwnersTurn()) return false; const self = source.permanent(); if (self === undefined) return false; const def = ctx.game.definitionOf(self.topCard); return def.nameEn.includes("Imperialdramon") || (def.types ?? []).includes("Free") || (def.attributes ?? []).includes("Free"); }, resolve: async (ctx) => { const self = source.permanent(); if (self !== undefined) ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEachTurnEnd); } }),
  ];
} };
registerCard(module);
export default module;
