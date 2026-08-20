// @ts-nocheck
import { EffectTiming } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
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
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasLinkRequirement: true,
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["trash", "digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasLinkRequirement: true,
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["trash", "digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  isSelfRef: true,
                  zone: "linked",
                },
                count: 1,
                upTo: false,
              },
              payCost: false,
              from: ["linked"],
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Roamon", "Effecmon"],
      cost: 0,
    },
  ],
};

const cardId = "BT22-075";
registerIrCard(cardId, {
  ...compiled,
  effects: compiled.effects.filter((effect) => effect.trigger !== "AllTurns"),
});
const interpreted = getEffectModule(cardId)!;
unregisterCard(cardId);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    const effects = interpreted.effectsForTiming(timing, source);
    if (timing !== EffectTiming.None) return effects;
    return [
      ...effects,
      staticModifier({
        source,
        effectKey: `${cardId}/play-link-on-leave`,
        description:
          "[All Turns] [Once Per Turn] When this Digimon would leave the battle area, you may play 1 link card.",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self === undefined) return;
          ctx.fx.subscribeReplacement({
            event: "wouldLeavePlay",
            sourcePermanentId: self.permanentId,
            mode: "instead",
            oncePerTurnKey: `${cardId}/play-link-on-leave/${self.permanentId}`,
            description: "Play 1 of this Digimon's link cards without paying the cost.",
            appliesTo: (_subCtx, leavingId) => leavingId === self.permanentId,
            apply: async (subCtx) => {
              const current = subCtx.game.permanentById(self.permanentId);
              if (current === undefined || current.linked.length === 0) return;
              if (!(await subCtx.ask.optional(subCtx, "Play 1 link card without paying the cost?"))) return;
              const chosen = await subCtx.ask.selectCards(subCtx, {
                candidates: current.linked.map((card) => card.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) await subCtx.fx.playInstances(chosen, { payCost: false });
            },
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
