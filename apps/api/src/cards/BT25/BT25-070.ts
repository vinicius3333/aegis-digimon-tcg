// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          from: ["trash", "digivolutionCards"],
          costDelta: -1,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          on: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  playCostLte: 4,
                },
                count: 1,
              },
            },
          ],
          raw: "When this Digimon gets linked, delete 1 of your opponent's Digimon with a play cost of 4 or less",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Offmon", "Hackmon"],
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

async function restrictOneOpposingPermanent(ctx: Parameters<Effect["resolve"]>[0], source: CardSource): Promise<void> {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const candidates = opponent.battleArea
    .filter((permanent) => {
      if (permanent.inBreeding || permanent.topCard === undefined) return false;
      const kinds = ctx.game.definitionOf(permanent.topCard).kinds;
      return kinds.includes(CardKind.Digimon) || kinds.includes(CardKind.Tamer);
    })
    .map((permanent) => permanent.permanentId);
  if (candidates.length === 0) return;
  const chosen =
    candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  for (const permanentId of chosen) {
    ctx.fx.restrict(permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
  }
}

const baseModule = irCardModule("BT25-070", compiled);
const module: EffectModule = {
  cardId: "BT25-070",
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing !== EffectTiming.None) return effects;
    effects.push(
      staticModifier({
        source,
        effectKey: "BT25-070/link-face-when-linking-no-unsuspend",
        description: "[When Linking] 1 of your opponent's Digimon or Tamers can't unsuspend until their turn ends.",
        optional: false,
        isLinked: true,
        when: (ctx) => linkedHost(ctx, source) !== undefined,
        resolve: async (ctx) => {
          const host = linkedHost(ctx, source);
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenLinked",
            sourcePermanentId: host.permanentId,
            once: false,
            description: "BT25-070: linked face prevents one opposing Digimon/Tamer from unsuspending.",
            matches: (subCtx) => subCtx.trigger.linkedCardInstanceIds?.includes(source.instanceId) === true,
            run: async (subCtx) => restrictOneOpposingPermanent(subCtx, source),
          });
        },
      }),
    );
    return effects;
  },
};

registerCard(module);
export default module;
