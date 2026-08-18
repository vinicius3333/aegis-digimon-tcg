import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "ST4-15";
async function suspendOpponent(ctx: EffectContext, source: CardSource): Promise<void> { const candidates = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard))).map((p) => p.permanentId); if (!candidates.length) return; const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }); if (chosen[0]) await ctx.fx.suspend([chosen[0]], { byEffectSeat: source.ownerSeat }); }
const module: EffectModule = { cardId, effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] { if (timing === EffectTiming.OnUseOption) return [activated({ source, effectKey: `${cardId}/main`, description: "[Main] Suspend 1 opposing Digimon.", resolve: async (ctx) => suspendOpponent(ctx, source) })]; if (timing === EffectTiming.SecuritySkill) return [security({ source, effectKey: `${cardId}/security`, description: "[Security] Activate Main, then add this card to hand.", resolve: async (ctx) => { await suspendOpponent(ctx, source); await ctx.fx.returnToHand([source.instanceId]); } })]; return []; } };
registerCard(module);
export default module;
