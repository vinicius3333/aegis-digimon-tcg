import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-008";
const module: EffectModule = { cardId, effectsForTiming(timing, source) {
  if (timing === EffectTiming.OnDestroyedAnyone) return [onDeletion({ source, effectKey: `${cardId}/save`, description: "[On Deletion] Save.", optional: true, resolve: async (ctx) => { const tamers = ctx.game.player(source.ownerSeat).battleArea.filter((p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard))).map((p) => p.permanentId); if (tamers.length === 0) return; const [host] = await ctx.ask.selectPermanents(ctx, { candidates: tamers, min: 1, max: 1 }); if (host !== undefined) await ctx.fx.placeUnder(host, [source.instanceId], { belowTop: true }); } })];
  if (timing === EffectTiming.OnUseAttack) return [whenAttacking({ source, effectKey: `${cardId}/inherited-save-delete`, description: "[When Attacking][Once Per Turn] If the host has Save, delete an opposing 4000 DP or less Digimon.", isInherited: true, maxPerTurn: 1, canActivate: (ctx) => { const top = source.permanent()?.topCard; if (top === undefined) return false; const def = ctx.game.definitionOf(top); return `${def.effectText ?? ""}${def.inheritedEffectText ?? ""}`.includes("Save"); }, resolve: async (ctx) => { const candidates = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= 4000).map((p) => p.permanentId); if (candidates.length === 0) return; const chosen = await ctx.ask.selectPermanents(ctx, { candidates, min: 1, max: 1 }); if (chosen.length > 0) await ctx.fx.deletePermanent(chosen); } })];
  return [];
} };
registerCard(module);
export default module;
