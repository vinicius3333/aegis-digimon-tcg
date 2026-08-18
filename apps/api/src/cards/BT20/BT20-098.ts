// @ts-nocheck
import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT20-098 — Phantomon (Black Option). [Main] Return 9 levels' worth of opponent's Digimon from trash to deck bottom, play matching-level [Ghost] Digimon from own trash, grant Rush + Blocker. [Security] Play Ghost Lv≤5 from trash. */
const cardId = "BT20-098";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [activated({ source, effectKey: `${cardId}/main`, description: "[Main] By returning 9 levels' worth of opponent Digimon from trash, play matching-level [Ghost] Digimon from your trash and grant Rush+Blocker.", optional: true, canActivate: (ctx: any) => { const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)); const oppLevels = opp.trash.reduce((sum: number, c: any) => sum + ((ctx.game.definitionOf(c) as any).level ?? 0), 0); return oppLevels >= 9; }, resolve: async (ctx: any) => { /* Complex engine capability: play-per-level */ } })];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [security({ source, effectKey: `${cardId}/security`, description: "[Security] Play 1 [Ghost] trait Digimon from your trash without paying the cost.", optional: false, resolve: async (ctx) => { const owner = ctx.game.player(source.ownerSeat); const ghosts = owner.trash.filter((c: any) => { const def = ctx.game.definitionOf(c); return isDigimon(def) && (def.types as string[]|undefined)?.includes("Ghost") && ((def as any).level ?? 0) <= 5; }); if (!ghosts.length) return; const s = await ctx.ask.selectCards(ctx, { candidates: ghosts.map((c: any) => c.instanceId), min: 0, max: 1 }); if (s.length) await ctx.fx.playInstances(s, { payCost: false }); } })];
    }
    return [];
  },
};
registerCard(module);
export default module;
