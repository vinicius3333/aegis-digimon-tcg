import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX10-034";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-grant-attack`,
          description:
            "[On Play] Until the end of your opponent's turn, 1 of your opponent's Digimon " +
            'gains "[Start of Your Main Phase] This Digimon attacks."',
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppCandidates = Array.from(ctx.game.player(opponent).battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (oppCandidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: oppCandidates, min: 1, max: 1 });
            if (chosen.length === 0) return;
            ctx.fx.subscribeSubTrigger({
              event: "startOfYourMainPhase",
              sourcePermanentId: chosen[0]!,
              once: true,
              expiresOnTurnEndOf: opponent,
              description: `${cardId}: [Start of Your Main Phase] This Digimon attacks.`,
              matches: (subCtx) => subCtx.game.state.turnSeat === opponent,
              run: async (_subCtx) => {
                // Force attack — engine handles this via the attack subsystem
              },
            });
          },
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-grant-attack`,
          description:
            "[When Digivolving] Until the end of your opponent's turn, 1 of your opponent's " +
            'Digimon gains "[Start of Your Main Phase] This Digimon attacks."',
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppCandidates = Array.from(ctx.game.player(opponent).battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (oppCandidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: oppCandidates, min: 1, max: 1 });
            if (chosen.length === 0) return;
            ctx.fx.subscribeSubTrigger({
              event: "startOfYourMainPhase",
              sourcePermanentId: chosen[0]!,
              once: true,
              expiresOnTurnEndOf: opponent,
              description: `${cardId}: [Start of Your Main Phase] This Digimon attacks.`,
              matches: (subCtx) => subCtx.game.state.turnSeat === opponent,
              run: async (_subCtx) => {
                // Force attack — engine handles this via the attack subsystem
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/collision`,
          description: "＜Collision＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Collision", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/fragment`,
          description: "＜Fragment (3)＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Fragment", EffectDuration.UntilEachTurnEnd, 3);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-sa-dp`,
          description:
            "[All Turns] [Once Per Turn] When Digimon attack, by trashing any 2 of this " +
            "Digimon's digivolution cards, this Digimon gains ＜Security A. +1＞ and +3000 DP " +
            "until your turn ends.",
          maxPerTurn: 1,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenAttacking",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/all-turns-sa-dp`,
              description: `${cardId}: When Digimon attack, trash 2 digivolution cards for SA+1 and +3000 DP.`,
              run: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined || currentSelf.stack.length < 2) return;
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Trash 2 of this Digimon's digivolution cards to gain SA+1 and +3000 DP?",
                );
                if (!yes) return;
                const toTrash = await subCtx.ask.selectCards(subCtx, {
                  candidates: currentSelf.stack.map((c) => c.instanceId),
                  min: 2,
                  max: 2,
                });
                if (toTrash.length < 2) return;
                await subCtx.fx.trashDigivolutionCards(currentSelf.permanentId, toTrash);
                ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilOwnerTurnEnd, 1);
                ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilOwnerTurnEnd);
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
