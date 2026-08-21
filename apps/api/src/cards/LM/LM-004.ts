import type { CardDefinition } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "LM-004";
const hasJellymonText = (d: CardDefinition) => d.effectText?.includes("Jellymon") || d.inheritedEffectText?.includes("Jellymon");
const module: EffectModule = { cardId, effectsForTiming(timing: EffectTiming, source: CardSource) {
  if (timing !== EffectTiming.None) return [];
  return [staticModifier({ source, effectKey: `${cardId}/inherited-hand-jellymon-trash-unsuspend`, description: "When a card with [Jellymon] in its text is trashed from your hand, unsuspend this Digimon.", isInherited: true, maxPerTurn: 1, resolve: async (ctx) => {
    const host = source.permanent(); if (host === undefined) return;
    ctx.fx.subscribeSubTrigger({ event: "whenHandTrashed", sourcePermanentId: host.permanentId, once: false, oncePerTurnKey: `${cardId}/inherited-hand-jellymon-trash-unsuspend`, matches: (subCtx) => {
      if (subCtx.trigger?.handTrashedSeat !== source.ownerSeat) return false;
      const id = subCtx.trigger.trashedFromHandInstanceId; const card = subCtx.game.player(source.ownerSeat).trash.find((entry) => entry.instanceId === id);
      return card !== undefined && hasJellymonText(subCtx.game.definitionOf(card));
    }, run: async (subCtx) => { const current = subCtx.source.permanent(); if (current !== undefined) await subCtx.fx.unsuspend([current.permanentId]); } });
  } })];
} };
registerCard(module);
export default module;
