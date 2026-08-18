import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX10-063";

function hasMineralOrRock(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Mineral" || t === "Rock");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-return-play`,
          description:
            "[Start of Your Main Phase] By returning this Tamer to the bottom of the deck, " +
            "you may play 1 [Close] from your hand without paying the cost. Then, if you " +
            "don't have a Digimon, you may play 1 [Sunarizamon] from your trash without " +
            "paying the cost.",
          optional: true,
          when: (ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const closeCard = Array.from(owner.hand).find((c) => {
              const def = ctx.game.definitionOf(c);
              return def.nameEn === "Close";
            });
            if (closeCard !== undefined) {
              const willPlayClose = await ctx.ask.optional(
                ctx,
                "Play 1 [Close] from your hand without paying the cost? (Tamer returns to deck)",
              );
              if (!willPlayClose) return;
              await ctx.fx.returnToDeck([source.instanceId], { toTop: false });
              await ctx.fx.playInstances([closeCard.instanceId], { payCost: false });
            }

            const hasDigimon = Array.from(owner.battleArea).some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
            if (!hasDigimon) {
              const sunariCard = Array.from(owner.trash).find((c) => {
                const def = ctx.game.definitionOf(c);
                return def.nameEn === "Sunarizamon";
              });
              if (sunariCard !== undefined) {
                const willPlaySunari = await ctx.ask.optional(
                  ctx,
                  "Play 1 [Sunarizamon] from your trash without paying the cost?",
                );
                if (willPlaySunari) {
                  await ctx.fx.playInstances([sunariCard.instanceId], { payCost: false });
                }
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/digivolution-trash-gain-memory`,
          description:
            "[All Turns] When effects trash any of your [Mineral] or [Rock] trait Digimon's " +
            "digivolution cards, by suspending this Tamer, gain 1 memory.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Mineral/Rock digivolution trashed, suspend + gain memory.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasMineralOrRock(def);
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
