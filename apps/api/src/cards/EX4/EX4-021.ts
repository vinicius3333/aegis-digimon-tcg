import { CardKind, EffectDuration, EffectTiming, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming } from "../../engine/effects/builders.js";
import { compiledEffects } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-021 — GreyKnightsmon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
        {
          kind: "Restrict",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: "all",
          },
          restriction: "attackPlayers",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["MetalGreymon"], match: "name" }] },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
            {
              kind: "PlayWithoutCost",
              target: {
                filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DarkKnightmon"], match: "name" }] },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return false;
            // Ensure this permanent is the one being removed
            if (ctx.trigger.deletedPermanentId !== selfPerm.permanentId) return false;
            return true;
          },
          canActivate: (ctx) => {
            return eligibleMetalGreymonInStack(ctx).length >= 1 || eligibleDarkKnightmonInStack(ctx).length >= 1;
          },
          resolve: async (ctx) => {
            const mgIds = eligibleMetalGreymonInStack(ctx);
            const dkIds = eligibleDarkKnightmonInStack(ctx);

            const toPlay: string[] = [];

            // Select 1 MetalGreymon
            if (mgIds.length > 0) {
              const chosenMg = await ctx.ask.selectCards(ctx, {
                candidates: mgIds,
                min: 1,
                max: 1,
              });
              if (chosenMg.length > 0) toPlay.push(...chosenMg);
            }

            // Select 1 DarkKnightmon
            if (dkIds.length > 0) {
              const chosenDk = await ctx.ask.selectCards(ctx, {
                candidates: dkIds,
                min: 1,
                max: 1,
              });
              if (chosenDk.length > 0) toPlay.push(...chosenDk);
            }

            if (toPlay.length > 0) {
              await ctx.fx.playInstances(toPlay, { payCost: false });
            }
          },
        }),
      ];
    }

    // Also need WouldLeavePlay for return-to-hand and return-to-deck
    // In our engine: OnLeaveFieldAnyone covers both
    if (timing === EffectTiming.OnLeaveFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/would-leave-play-play-from-stack-bounce`,
          description:
            "[All Turns] When this Digimon would be returned to hand/deck, " +
            "you may play MetalGreymon + DarkKnightmon from digivolution cards without cost.",
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return false;
            return true;
          },
          canActivate: (ctx) => {
            return eligibleMetalGreymonInStack(ctx).length >= 1 || eligibleDarkKnightmonInStack(ctx).length >= 1;
          },
          resolve: async (ctx) => {
            const mgIds = eligibleMetalGreymonInStack(ctx);
            const dkIds = eligibleDarkKnightmonInStack(ctx);
            const toPlay: string[] = [];

            if (mgIds.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates: mgIds, min: 1, max: 1 });
              if (chosen.length > 0) toPlay.push(...chosen);
            }
            if (dkIds.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates: dkIds, min: 1, max: 1 });
              if (chosen.length > 0) toPlay.push(...chosen);
            }

            if (toPlay.length > 0) {
              await ctx.fx.playInstances(toPlay, { payCost: false });
            }
          },
        }),
      ];
    }

    return [];
  },
};

const compiled = JSON.parse(JSON.stringify(compiledEffects[cardId]!)) as CompiledCard;
const replacement = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
if (replacement?.kind === "Replacement") {
  replacement.event = "wouldLeavePlay";
  replacement.raw = "When this Digimon would leave the battle area, play MetalGreymon and DarkKnightmon from its digivolution cards without paying their costs.";
  replacement.actions = [
    { kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["MetalGreymon"], match: "name" }] }, count: 1 }, from: ["digivolutionCards"], payCost: false, optional: true },
    { kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DarkKnightmon"], match: "name" }] }, count: 1 }, from: ["digivolutionCards"], payCost: false, optional: true },
  ];
}
compiled.coverage = "full";
compiled.residual = [];
registerIrCard(cardId, compiled);
export default module;
