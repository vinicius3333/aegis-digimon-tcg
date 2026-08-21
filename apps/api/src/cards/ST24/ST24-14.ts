import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, onPlay, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST24-14";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main`,
          description:
            "[Start of Your Main Phase] You may place the top card of your deck face down under " +
            "this Tamer. Then, if your opponent has a Digimon, gain 1 memory.",
          optional: true,
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.deck.length > 0) {
              const topCard = Array.from(owner.deck)[0];
              if (topCard !== undefined) {
                const self = source.permanent();
                if (self !== undefined) {
                  await ctx.fx.placeUnder(self.permanentId, [topCard.instanceId], { belowTop: true, faceUp: false });
                }
              }
            }
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            if (Array.from(opp.battleArea).some((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))) {
              // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
              // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
              // owner explicitly rather than the turn player.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] You may place the top card of your deck face down under this Tamer. " +
            "Then, if your opponent has a Digimon, gain 1 memory.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.deck.length > 0) {
              const topCard = Array.from(owner.deck)[0];
              if (topCard !== undefined) {
                const self = source.permanent();
                if (self !== undefined) {
                  await ctx.fx.placeUnder(self.permanentId, [topCard.instanceId], { belowTop: true, faceUp: false });
                }
              }
            }
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            if (Array.from(opp.battleArea).some((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))) {
              ctx.fx.gainMemory(1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/cards-trashed`,
          description:
            "[All Turns] When effects trash cards from under this Tamer, by suspending this Tamer, " +
            "suspend 1 of your opponent's Digimon.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When cards under trashed, suspend opponent Digimon.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined || subjectId !== self.permanentId) return false;
                return true;
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (paid) {
                  const opponent = subCtx.game.opponentOf(source.ownerSeat);
                  const opp = subCtx.game.player(opponent);
                  const targets = Array.from(opp.battleArea)
                    .filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)) && !p.isSuspended)
                    // chooseTargets exposes permanent targets by their top-card instance id.
                    .map((p) => p.topCard!.instanceId);
                  if (targets.length > 0) {
                    const chosen = await subCtx.ask.chooseTargets(subCtx, {
                      candidates: targets,
                      min: 1,
                      max: 1,
                    });
                    if (chosen.length > 0) {
                      const target = opp.battleArea.find((p) => p.topCard?.instanceId === chosen[0]);
                      if (target !== undefined) subCtx.fx.suspend([target.permanentId]);
                    }
                  }
                }
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
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
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
