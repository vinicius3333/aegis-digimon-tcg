// @ts-nocheck
import { EffectTiming } from "@aegis/shared";
import type { CardInstance, CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { beforePayCost } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { getEffectModule, registerCard, unregisterCard } from "../../engine/effects/registry.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [],
      keywords: [
        {
          keyword: "Draw",
          amount: 1,
          raw: "＜Draw 1＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Eater"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the play costs by 1",
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
      isBreeding: true,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-079", compiled);

const interpreted = getEffectModule("BT22-079")!;
unregisterCard("BT22-079");
const module: EffectModule = {
  cardId: "BT22-079",
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.BeforePayCost) return interpreted.effectsForTiming(timing, source);
    return [
      beforePayCost({
        source,
        effectKey: "BT22-079/breeding-eater-cost-reduction",
        description:
          "[Breeding] [Your Turn] [Once Per Turn] When an Eater Digimon would be played, reduce its play cost by 1.",
        isInherited: true,
        optional: true,
        maxPerTurn: 1,
        canActivate: (ctx) => {
          const playedCardId = ctx.trigger.wouldBePlayedCardId;
          if (playedCardId === undefined) return false;
          const definition = ctx.game.definitionOf({ cardId: playedCardId } as CardInstance);
          return [...(definition.types ?? []), ...(definition.forms ?? [])].includes("Eater");
        },
        resolve: async (ctx) => {
          if (await ctx.ask.optional(ctx, "Reduce the Eater Digimon's play cost by 1?")) {
            ctx.playCostDelta = (ctx.playCostDelta ?? 0) + 1;
          }
        },
      }),
    ];
  },
};

registerCard(module);
