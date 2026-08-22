import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { compiledEffects } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * EX4-060 — Omnimon Alter-S (EX4, White Lv.7 Digimon).
 *
 * DNA digivolve requirement: Blue Lv.6 + Red Lv.6 (handled by engine).
 * [When Digivolving] Delete 1 opponent's Digimon with 8000 DP or less. Return
 *   1 opponent's Lv.6+ Digimon to deck bottom. (Two independent sub-effects.)
 * [All Turns] When this leaves battle area (not by owner's effect):
 *   play 1 [BlitzGreymon] + 1 [CresGarurumon] from digivolution cards
 *   without cost, then place this Digimon at bottom of security stack face down.
 */
const cardId = "EX4-060";

const compiled = {
  ...compiledEffects[cardId]!,
  effects: compiledEffects[cardId]!.effects.map((effect) => {
    if (effect.trigger === "WhenDigivolving") {
      return {
        ...effect,
        actions: [
          {
            kind: "Delete" as const,
            target: { filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
          },
          {
            kind: "Return" as const,
            target: { filter: { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } }, count: 1 },
            to: "deckBottom" as const,
          },
        ],
      };
    }
    if (effect.trigger === "AllTurns") {
      return {
        ...effect,
        actions: [
          {
            kind: "Replacement" as const,
            event: "wouldLeavePlay" as const,
            sourceFilter: { isSelfRef: true },
            actions: [
              { kind: "PlayWithoutCost" as const, target: { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["BlitzGreymon"], match: "nameExact" }] }, count: 1 }, from: ["digivolutionCards"], payCost: false },
              { kind: "PlayWithoutCost" as const, target: { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["CresGarurumon"], match: "nameExact" }] }, count: 1 }, from: ["digivolutionCards"], payCost: false },
            ],
          },
          ...effect.actions.filter((action) => action.kind !== "Replacement"),
        ],
      };
    }
    return effect;
  }),
  coverage: "full" as const,
  residual: [],
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Delete 1 of your opponent's Digimon with 8000 DP or less, and return 1 of your opponent's level 6 or higher Digimon to the bottom of its owner's deck.",
          optional: false,
          resolve: async (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));

            const delTargets = opp.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
                return p.currentDP <= 8000;
              })
              .map((p) => p.permanentId);
            if (delTargets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: delTargets, min: 1, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.deletePermanent(chosen, "byEffect");
              }
            }

            const bounceTargets = opp.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!isDigimon(def)) return false;
                return (def.level ?? 0) >= 6;
              })
              .map((p) => p.permanentId);
            if (bounceTargets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: bounceTargets, min: 1, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.returnToDeck(chosen, { toTop: false });
              }
            }
          },
        }),
      ];
    }

    // [All Turns] Replace leave play → play BlitzGreymon + CresGarurumon → bottom security.
    if (timing === EffectTiming.OnLeaveFieldAnyone) {
      return [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
        },
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } }, count: 1 },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["BlitzGreymon"], match: "nameExact" }] }, count: 1 },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
            {
              kind: "PlayWithoutCost",
              target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CresGarurumon"], match: "nameExact" }] }, count: 1 },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "mine",
              amount: 1,
              source: "this",
              faceDown: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
export default module;
