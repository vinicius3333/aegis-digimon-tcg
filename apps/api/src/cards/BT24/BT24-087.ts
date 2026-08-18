// @ts-nocheck
import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT24-087 — Rei Katsura (Yellow Tamer). [Start Main] If opponent has Digimon, +1 memory. [Your Turn] When linked, suspend to Draw 1 + trash 1 from hand, then Digimon may app fuse into System/Life/Transmutation from trash. [Security] Play. */
const cardId = "BT24-087";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [turnTiming({ source, effectKey: `${cardId}/start-main`, description: "[Start Main] If opponent has Digimon, +1 memory.", optional: false, when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(), canActivate: (ctx) => ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.some((p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard))), resolve: async (ctx) => ctx.fx.gainMemory(1) })];
    }
    if (timing === EffectTiming.SecuritySkill) return [security({ source, effectKey: `${cardId}/sec`, description: "[Security] Play.", optional: false, resolve: async (ctx) => { await ctx.fx.playInstances([source.instanceId], { payCost: false }); } })];
    return [];
  },
};
registerCard(module);
export default module;
