import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-199";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-dp`,
          description: "If you have 4 or less memory, 1 of your Digimon gets +3000 DP for the turn.",
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn() && ctx.game.state.memory <= 4,
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter(
                (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
              )
              .map((permanent) => permanent.permanentId);
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length > 0) ctx.fx.modifyDP(chosen[0]!, 3000, EffectDuration.UntilEachTurnEnd);
          },
        }),
        turnTiming({
          source,
          effectKey: `${cardId}/ts-play-cost-this-turn`,
          description: "[Your Turn] Reduce the play cost of your TS Digimon by 1.",
          when: () => source.isOnBattleArea() && source.isOwnersTurn() && !source.permanent()?.isSuspended,
          resolve: async (ctx) => {
            ctx.fx.changePlayCost(
              ({ def }) => def.kinds.includes(CardKind.Digimon) && (def.types ?? []).includes("TS"),
              -1,
            );
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/ts-play-cost`,
          description:
            "[Your Turn] When a TS Digimon would be played, by suspending this Tamer, reduce its play cost by 1.",
          when: () => {
            const self = source.permanent();
            return source.isOnBattleArea() && source.isOwnersTurn() && self !== undefined && !self.isSuspended;
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: pay the TS play-cost reduction by suspending this Tamer`,
              matches: (subCtx) => {
                const playedId = subCtx.trigger.subjectPermanentId;
                if (playedId === undefined) return false;
                const played = subCtx.game.permanentById(playedId);
                return (
                  played?.controllerSeat === source.ownerSeat &&
                  played.topCard !== undefined &&
                  isDigimon(subCtx.game.definitionOf(played.topCard)) &&
                  (subCtx.game.definitionOf(played.topCard).types ?? []).includes("TS")
                );
              },
              run: async (subCtx) => {
                const current = source.permanent();
                if (current !== undefined && !current.isSuspended) await subCtx.fx.suspend([current.permanentId]);
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying its memory cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
