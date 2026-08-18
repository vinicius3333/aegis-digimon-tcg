import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-057";

function hasIceSnow(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes("Ice-Snow");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-gain-memory`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            return Array.from(ctx.game.player(opponent).battleArea).some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => {
            // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
            // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
            // Tamer's owner explicitly rather than the turn player.
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-digi`,
          description:
            "[On Play] For each of your [Ice-Snow] trait Digimon, trash any 1 digivolution " +
            "card from your opponent's Digimon.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const iceSnowCount = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && hasIceSnow(ctx.game.definitionOf(p.topCard)))
              .length;
            if (iceSnowCount === 0) return;
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppDigimon = Array.from(ctx.game.player(opponent).battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length > 0);
            if (oppDigimon.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: oppDigimon.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;
            const target = ctx.game.permanentById(chosen[0]!);
            if (target === undefined) return;
            const toTrash = target.stack.slice(0, Math.min(iceSnowCount, target.stack.length));
            if (toTrash.length > 0) {
              await ctx.fx.trashDigivolutionCards(chosen[0]!, toTrash.map((c) => c.instanceId));
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/digivolution-trashed-gain-memory`,
          description:
            "[All Turns] When effects trash digivolution cards from your opponent's Digimon, " +
            "by suspending this Tamer, gain 1 memory.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When opponent digivolution trashed, suspend + gain memory.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined) return false;
                return subject.controllerSeat !== source.ownerSeat;
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                // [All Turns]: the trashing effect can resolve on either player's turn.
                subCtx.fx.gainMemoryForSeat(source.ownerSeat, 1);
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
