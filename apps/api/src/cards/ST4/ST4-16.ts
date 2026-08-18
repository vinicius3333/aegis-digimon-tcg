import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "ST4-16";
async function bounceSuspended(ctx: EffectContext, source: CardSource): Promise<void> { const candidates = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((p) => p.topCard !== undefined && p.isSuspended && isDigimon(ctx.game.definitionOf(p.topCard))).map((p) => p.permanentId); if (!candidates.length) return; const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }); const target = chosen[0] ? ctx.game.permanentById(chosen[0]) : undefined; if (target?.topCard) await ctx.fx.returnToHand([target.topCard.instanceId]); }
const module: EffectModule = { cardId, effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] { if (timing === EffectTiming.OnUseOption) return [activated({ source, effectKey: `${cardId}/main`, description: "[Main] Return 1 suspended opposing Digimon to hand, trashing its sources.", resolve: async (ctx) => bounceSuspended(ctx, source) })]; if (timing === EffectTiming.SecuritySkill) return [security({ source, effectKey: `${cardId}/security`, description: "[Security] Activate this card's Main effect.", resolve: async (ctx) => bounceSuspended(ctx, source) })]; return []; } };
registerCard(module);
export default module;
