// @ts-nocheck
import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT21-093 — Raging Serpentine (Red Option). Cost -4 if opponent has ≤3 security. [Main] Delete opponent's highest DP Digimon, place in battle area. [All Turns] When opponent security removed, Delay -> Digivolve into Reptile/Dragonkin from hand. [Security] Delete opponent's highest DP Digimon. */
const cardId = "BT21-093";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [activated({ source, effectKey: `${cardId}/main`, description: "[Main] Delete opponent's highest DP Digimon, place this card in battle area.", optional: false, canActivate: (ctx: any) => { const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)); return opp.battleArea.some((p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard))); }, resolve: async (ctx: any) => { const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)); const digis = opp.battleArea.filter((p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard))); if (!digis.length) return; const maxDp = Math.max(...digis.map((p: any) => p.currentDP)); const candidates = digis.filter((p: any) => p.currentDP === maxDp).map((p: any) => p.permanentId); const s = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 }); if (s.length) await ctx.fx.deletePermanent(s); await ctx.fx.placeOptionAsPermanent?.(source.instanceId); } })];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [security({ source, effectKey: `${cardId}/security-delete`, description: "[Security] Delete opponent's highest DP Digimon.", optional: false, resolve: async (ctx: any) => { const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)); const digis = opp.battleArea.filter((p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard))); if (!digis.length) return; const maxDp = Math.max(...digis.map((p: any) => p.currentDP)); const candidates = digis.filter((p: any) => p.currentDP === maxDp).map((p: any) => p.permanentId); const s = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 }); if (s.length) await ctx.fx.deletePermanent(s); } })];
    }
    return [];
  },
};
registerCard(module);
export default module;
