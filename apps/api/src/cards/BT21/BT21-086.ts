// @ts-nocheck
import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, onPlay, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT21-086 — Marcus Damon (Red Tamer). */
const cardId = "BT21-086";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          optional: false,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opp.battleArea.some(
              (p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => ctx.fx.gainMemory(1),
        }),
      ];
    }
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description: "[On Play] 1 of your [Marcus Damon]s may suspend.",
          optional: true,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.battleArea
              .filter((p: any) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return (def.kinds as string[]).includes("Tamer") && def.nameEn === "Marcus Damon" && !p.isSuspended;
              })
              .map((p: any) => p.permanentId);
            if (candidates.length === 0) return;
            const selected = await ctx.ask.selectPermanents(ctx, { candidates, min: 0, max: 1 });
            if (selected.length > 0) await ctx.fx.suspend([selected[0]!]);
          },
        }),
      ];
    }
    if (timing === EffectTiming.OnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/on-suspend`,
          description:
            "[All Turns][Once Per Turn] When this Tamer is suspended, 1 your Digimon gains Piercing/DP, 1 opponent loses DP.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => {
            const sid = ctx.trigger?.suspendedPermanentId;
            return sid === source.permanent()?.permanentId;
          },
          resolve: async (ctx: any) => {
            const owner = ctx.game.player(source.ownerSeat);
            const mine = owner.battleArea
              .filter((p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p: any) => p.permanentId);
            if (mine.length) {
              const s = await ctx.ask.selectPermanents(ctx, { candidates: mine, min: 1, max: 1 });
              if (s.length) {
                ctx.fx.grantPierce(s[0], EffectDuration.UntilEachTurnEnd);
                ctx.fx.modifyDP(s[0], 3000, EffectDuration.UntilEachTurnEnd);
              }
            }
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const theirs = opp.battleArea
              .filter((p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p: any) => p.permanentId);
            if (theirs.length) {
              const s = await ctx.ask.selectPermanents(ctx, { candidates: theirs, min: 1, max: 1 });
              if (s.length) ctx.fx.modifyDP(s[0], -3000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/sec`,
          description: "[Security] Play.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
