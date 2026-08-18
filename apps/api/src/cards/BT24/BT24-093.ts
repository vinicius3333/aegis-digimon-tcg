// @ts-nocheck
import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/** BT24-093 — Aegiochusmon: Cerulean (Black Option). [Main] Security-to-hand + Recovery +1 + place self. [All Turns] When security removed, Delay -> place Aegiochusmon/Jupitermon top stack as security. [Security] Play Aegiomon/Elecmon from hand/trash. */
const cardId = "BT24-093";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [activated({ source, effectKey: `${cardId}/main`, description: "[Main] Add top security to hand, Recovery +1, place in battle area.", optional: false, canActivate: (ctx: any) => ctx.game.player(source.ownerSeat).security.length >= 1, resolve: async (ctx: any) => { const owner = ctx.game.player(source.ownerSeat); if (owner.security.length >= 1) { await ctx.fx.securityToHand(source.ownerSeat, 1, { fromTop: true }); } await ctx.fx.recoverToSecurity(source.ownerSeat, 1); await ctx.fx.placeOptionAsPermanent?.(source.instanceId); } })];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [security({ source, effectKey: `${cardId}/sec`, description: "[Security] Play Aegiomon or Elecmon from hand/trash.", optional: false, resolve: async (ctx: any) => { const owner = ctx.game.player(source.ownerSeat); const fromHandTrash = [...owner.hand, ...owner.trash].filter((c: any) => { const def = ctx.game.definitionOf(c); return isDigimon(def) && matchNameOrTrait(def, { tokens: ["Aegiomon", "Elecmon"], match: "nameExact" }); }); if (!fromHandTrash.length) return; const s = await ctx.ask.selectCards(ctx, { candidates: fromHandTrash.map((c: any) => c.instanceId), min: 0, max: 1 }); if (s.length) await ctx.fx.playInstances(s, { payCost: false }); } })];
    }
    return [];
  },
};
registerCard(module);
export default module;
