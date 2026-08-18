import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-069";

function hasSevenGreatDemonLords(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes("Seven Great Demon Lords");
}

function isGateOfDeadlySins(def: CardDefinition): boolean {
  return def.nameEn === "Gate of Deadly Sins";
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] You may place 1 Digimon card with the [Seven Great Demon Lords] trait " +
            "from your hand or trash as the bottom digivolution card of the [Gate of Deadly " +
            "Sins] in your breeding area. Then, place this card in your battle area.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const fromHand = Array.from(owner.hand).filter((c) =>
              hasSevenGreatDemonLords(ctx.game.definitionOf(c)),
            );
            const fromTrash = Array.from(owner.trash).filter((c) =>
              hasSevenGreatDemonLords(ctx.game.definitionOf(c)),
            );
            if (fromHand.length === 0 && fromTrash.length === 0) {
              if (ctx.fx.placeOptionAsPermanent) {
                await ctx.fx.placeOptionAsPermanent(source.instanceId);
              }
              return;
            }

            let sourceChoice = 0;
            if (fromHand.length > 0 && fromTrash.length > 0) {
              sourceChoice = await ctx.ask.chooseOption(ctx, ["Trash", "Hand"]);
            } else if (fromHand.length > 0) {
              sourceChoice = 1;
            }

            const candidates = sourceChoice === 0 ? fromTrash : fromHand;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) {
              const breedingPerm = owner.breeding;
              if (breedingPerm !== undefined && breedingPerm.topCard !== undefined &&
                  isGateOfDeadlySins(ctx.game.definitionOf(breedingPerm.topCard))) {
                await ctx.fx.placeUnder(breedingPerm.permanentId, chosen);
              }
            }

            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card as a battle-area permanent.",
          resolve: async (ctx) => {
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/delay-trigger`,
          description:
            "[All Turns] When one of your Digimon with the [Seven Great Demon Lords] trait " +
            "is deleted, ＜Delay＞. • You may play 1 Digimon card with the [Seven Great Demon " +
            "Lords] trait from the digivolution cards of your [Gate of Deadly Sins] in the " +
            "breeding area without paying the cost.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;
            ctx.fx.subscribeSubTrigger({
              event: "onDeletionOf",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              description: `${cardId}: When Seven Great Demon Lords Digimon deleted, delay trigger.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return hasSevenGreatDemonLords(def);
              },
              run: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return;
                await subCtx.fx.deletePermanent([self.permanentId]);
                const owner = subCtx.game.player(ownerSeat);
                const breedingPerm = owner.breeding;
                if (breedingPerm === undefined || breedingPerm.topCard === undefined) return;
                if (!isGateOfDeadlySins(subCtx.game.definitionOf(breedingPerm.topCard))) return;
                const qualifying = breedingPerm.stack.filter((c) =>
                  hasSevenGreatDemonLords(subCtx.game.definitionOf(c)),
                );
                if (qualifying.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: qualifying.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await subCtx.fx.playInstances(chosen, { payCost: false });
                }
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
