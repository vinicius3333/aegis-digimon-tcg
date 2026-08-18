import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "ST5-16";
async function deleteTarget(ctx: EffectContext, source: CardSource): Promise<void> { const candidates = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((p) => { if (!p.topCard) return false; const def = ctx.game.definitionOf(p.topCard); return isDigimon(def) && (def.playCost ?? Number.POSITIVE_INFINITY) <= 7; }).map((p) => p.permanentId); if (!candidates.length) return; const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }); if (chosen.length) await ctx.fx.deletePermanent(chosen, "byEffect"); }
const module: EffectModule = { cardId, effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] { if (timing === EffectTiming.OnUseOption) return [activated({ source, effectKey: `${cardId}/main`, description: "[Main] Delete 1 opposing Digimon with play cost 7 or less.", resolve: async (ctx) => deleteTarget(ctx, source) })]; if (timing === EffectTiming.SecuritySkill) return [security({ source, effectKey: `${cardId}/security`, description: "[Security] Activate this card's Main effect.", resolve: async (ctx) => deleteTarget(ctx, source) })]; return []; } };
registerCard(module);
export default module;
