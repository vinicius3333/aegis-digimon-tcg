import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX1-008";
const module: EffectModule = { cardId, effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
  if (timing === EffectTiming.OnAllyAttack) return [whenAttacking({ source, effectKey: `${cardId}/delete-on-player-attack`, description: "[When Attacking] When this Digimon attacks a player, delete 1 opposing Digimon with 4000 DP or less.",
    when: (ctx) => { const self = source.permanent(); return self !== undefined && ctx.trigger.attackerPermanentId === self.permanentId && ctx.trigger.targetPermanentId === undefined; },
    resolve: async (ctx) => { const opponent = ctx.game.opponentOf(source.ownerSeat); const candidates = ctx.game.player(opponent).battleArea.filter((p) => isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= 4000).map((p) => p.permanentId); if (candidates.length === 0) return; const chosen = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 }); if (chosen[0] !== undefined) await ctx.fx.deletePermanent([chosen[0]]); },
  })];
  if (timing === EffectTiming.None) return [staticModifier({ source, effectKey: `${cardId}/inherited-piercing`, description: "Inherited [Your Turn] While this Digimon has Machine or Dragonkin in its traits, it gains Piercing.", isInherited: true,
    when: (ctx) => { if (!source.isOwnersTurn()) return false; const self = source.permanent(); if (self === undefined) return false; const types = ctx.game.definitionOf(self.topCard).types ?? []; return types.includes("Machine") || types.includes("Dragonkin"); },
    resolve: async (ctx) => { const self = source.permanent(); if (self !== undefined) ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEachTurnEnd); },
  })];
  return [];
} };
registerCard(module);
export default module;
