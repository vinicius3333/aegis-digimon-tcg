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
            const fromHand = Array.from(owner.hand).filter((c) => hasSevenGreatDemonLords(ctx.game.definitionOf(c)));
            const fromTrash = Array.from(owner.trash).filter((c) => hasSevenGreatDemonLords(ctx.game.definitionOf(c)));
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
              if (
                breedingPerm !== undefined &&
                breedingPerm.topCard !== undefined &&
                isGateOfDeadlySins(ctx.game.definitionOf(breedingPerm.topCard))
              ) {
                await ctx.fx.placeUnder(breedingPerm.permanentId, chosen);
              }
            }

            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
            }
          },
          underFilter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Gate of Deadly Sins"], match: "name" }],
            zone: "breeding",
          },
          from: ["hand", "trash"],
          optional: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          delayArmedIntrinsic: true,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }],
                  zone: "digivolutionCards",
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              source: "breeding",
            },
          ],
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "PlaceInBattleAreaSelf" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("EX6-069", compiled);
