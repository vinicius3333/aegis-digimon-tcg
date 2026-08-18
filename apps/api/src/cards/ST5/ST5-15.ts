import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "ST5-15";
async function dedigivolve(ctx: EffectContext, source: CardSource): Promise<void> { const candidates = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard))).map((p) => p.permanentId); const chosen = candidates.length ? await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: Math.min(2, candidates.length) }) : []; for (const id of chosen) ctx.fx.deDigivolve(id, 1, { byEffectSeat: source.ownerSeat, stopAtLevel: 3 }); }
const module: EffectModule = { cardId, effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] { if (timing === EffectTiming.OnUseOption) return [activated({ source, effectKey: `${cardId}/main`, description: "[Main] De-Digivolve 1 up to 2 opposing Digimon.", resolve: async (ctx) => dedigivolve(ctx, source) })]; if (timing === EffectTiming.SecuritySkill) return [security({ source, effectKey: `${cardId}/security`, description: "[Security] Activate this card's Main effect.", resolve: async (ctx) => dedigivolve(ctx, source) })]; return []; } };
registerCard(module);
export default module;
