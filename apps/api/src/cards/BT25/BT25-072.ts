// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// Keep the catalog-derived IR as the source of truth for the ordinary timing clauses;
// the registered wrapper below adds Shutmon's linked-card face, which the IR cannot express.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
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
          from: ["trash", "digivolutionCards"],
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
          from: ["trash", "digivolutionCards"],
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
          from: ["trash", "digivolutionCards"],
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
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
              },
              restriction: "digivolve",
              duration: "untilOpponentTurnEnd",
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
      names: ["Logamon", "Timemon"],
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

async function restrictTwoOpposingPermanents(ctx: Parameters<Effect["resolve"]>[0], source: CardSource): Promise<void> {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const candidates = opponent.battleArea
    .filter((permanent) => {
      if (permanent.inBreeding || permanent.topCard === undefined) return false;
      const kinds = ctx.game.definitionOf(permanent.topCard).kinds;
      return kinds.includes(CardKind.Digimon) || kinds.includes(CardKind.Tamer);
    })
    .map((permanent) => permanent.permanentId);
  if (candidates.length === 0) return;
  const chosen = candidates.length <= 2 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 2, max: 2 });
  for (const permanentId of chosen) {
    ctx.fx.restrict(permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
  }
}

const baseModule = irCardModule("BT25-072", compiled);
const module: EffectModule = {
  cardId: "BT25-072",
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing !== EffectTiming.None) return effects;
    effects.push(
      staticModifier({
        source,
        effectKey: "BT25-072/link-face-when-linking-no-unsuspend",
        description: "[When Linking] 2 of your opponent's Digimon or Tamers can't unsuspend until their turn ends.",
        optional: false,
        isLinked: true,
        resolve: async (ctx) => {
          const host = linkedHost(ctx, source);
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenLinked",
            sourcePermanentId: host.permanentId,
            once: false,
            description: "BT25-072: linked face prevents two opposing Digimon/Tamers from unsuspending.",
            matches: (subCtx) => subCtx.trigger.linkedCardInstanceIds?.includes(source.instanceId) === true,
            run: async (subCtx) => restrictTwoOpposingPermanents(subCtx, source),
          });
        },
      }),
    );
    return effects;
  },
};

registerCard(module);
export { compiled };
export default module;
