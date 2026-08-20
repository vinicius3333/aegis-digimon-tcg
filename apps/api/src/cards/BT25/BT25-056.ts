import { CardKind, EffectTiming } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

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
          keyword: "Barrier",
          raw: "＜Barrier＞",
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
              hostFilter: { isSelfRef: true },
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          costDelta: -2,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
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
              hostFilter: { isSelfRef: true },
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          costDelta: -2,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          costDelta: -2,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Logimon", "Craftmon"],
      cost: 0,
    },
  ],
};

function linkedHost(ctx: Parameters<Effect["resolve"]>[0], source: CardSource) {
  for (const seat of [0, 1] as const) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (permanent.linked.some((card) => card.instanceId === source.instanceId)) return permanent;
    }
  }
  return undefined;
}

const baseModule = irCardModule("BT25-056", compiled);
const module: EffectModule = {
  cardId: "BT25-056",
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing !== EffectTiming.None) return effects;
    effects.push(
      staticModifier({
        source,
        effectKey: "BT25-056/link-face-return-suspended",
        description: "[When Linking] Return 1 opposing suspended Digimon to deck bottom.",
        isLinked: true,
        resolve: async (ctx) => {
          const host = linkedHost(ctx, source);
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenLinked",
            sourcePermanentId: host.permanentId,
            once: false,
            description: "BT25-056 linked face returns an opposing suspended Digimon.",
            matches: (subCtx) => subCtx.trigger.linkedCardInstanceIds?.includes(source.instanceId) === true,
            run: async (subCtx) => {
              const opponent = subCtx.game.player(subCtx.game.opponentOf(source.ownerSeat));
              const candidates = opponent.battleArea.filter((permanent) => {
                if (permanent.inBreeding || !permanent.isSuspended || permanent.topCard === undefined) return false;
                return subCtx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Digimon);
              });
              if (candidates.length === 0) return;
              const chosen =
                candidates.length === 1
                  ? [candidates[0]!.permanentId]
                  : await subCtx.ask.chooseTargets(subCtx, {
                      candidates: candidates.map((permanent) => permanent.permanentId),
                      min: 1,
                      max: 1,
                    });
              const target = candidates.find((permanent) => permanent.permanentId === chosen[0]);
              if (target?.topCard !== undefined) {
                await subCtx.fx.returnToDeck([target.topCard.instanceId], {
                  toTop: false,
                  byEffectSeat: source.ownerSeat,
                });
              }
            },
          });
        },
      }),
    );
    return effects;
  },
};

registerCard(module);
export default module;
