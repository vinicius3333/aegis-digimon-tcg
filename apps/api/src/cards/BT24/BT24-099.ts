// @ts-nocheck
import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT24-099 — Super Hacking (White Option). Waive color if Appmon on field. [Main] Trash Appmon from hand to Draw 2, place self. [All Turns] When Digimon deleted, Delay -> link Appmon from trash to your Digimon free. [Security] Place self. */
const cardId = "BT24-099";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [activated({ source, effectKey: `${cardId}/main`, description: "[Main] Trash Appmon from hand, Draw 2, place in battle area.", optional: true, canActivate: (ctx: any) => { return ctx.game.player(source.ownerSeat).hand.some((c: any) => { const def = ctx.game.definitionOf(c); return (def.types as string[]|undefined)?.includes("Appmon"); }); }, resolve: async (ctx: any) => { const owner = ctx.game.player(source.ownerSeat); const appmons = owner.hand.filter((c: any) => (ctx.game.definitionOf(c).types as string[]|undefined)?.includes("Appmon")).map((c: any) => c.instanceId); if (!appmons.length) return; const s = await ctx.ask.selectCards(ctx, { candidates: appmons, min: 0, max: 1 }); if (!s.length) return; await ctx.fx.trash(s); await ctx.fx.draw(source.ownerSeat, 2); await ctx.fx.placeOptionAsPermanent?.(source.instanceId); } })];
    }
    if (timing === EffectTiming.SecuritySkill) return [security({ source, effectKey: `${cardId}/sec`, description: "[Security] Place in battle area.", optional: false, resolve: async (ctx) => { await ctx.fx.placeOptionAsPermanent?.(source.instanceId); } })];
    return [];
  },
};
registerCard(module);
export default module;
