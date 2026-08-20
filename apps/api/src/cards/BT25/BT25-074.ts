// HAND-FIXED IR for BT25-074 (Tankdramon) — do not regenerate over this file.
//
// runtime-effect fix: "Reveal the top 3 cards of your deck. You may play 1 play cost 12 or
// lower [D-Brigade] or [ACCEL] trait Digimon card among them with the cost reduced by
// 5. Trash the rest." was split into a useless RevealAdd(add:[]) that added nothing,
// plus an unlinked PlayWithoutCost/Trash pair that didn't source from the revealed
// cards at all. Recompiled as a single RevealAdd with an add[] "play" disposition
// (costDelta:5, the new play-cost-reduction sibling of a full payCost:false waiver)
// and rest:"trash".
import { EffectDuration, EffectTiming, type CompiledCard } from "@aegis/shared";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["D-Brigade", "ACCEL"],
                    match: "trait",
                  },
                ],
                playCostLte: 12,
              },
              count: 1,
              to: "play",
              costDelta: 5,
              optional: true,
            },
          ],
          rest: "trash",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["D-Brigade", "ACCEL"],
                    match: "trait",
                  },
                ],
                playCostLte: 12,
              },
              count: 1,
              to: "play",
              costDelta: 5,
              optional: true,
            },
          ],
          rest: "trash",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["D-Brigade", "ACCEL"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "digivolve",
              duration: "untilOpponentTurnEnd",
            },
          ],
          raw: "whenPlayed",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["D-Brigade", "ACCEL"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

const baseModule = irCardModule("BT25-074", compiled);

const module: EffectModule = {
  cardId: "BT25-074",
  effectsForTiming(timing: EffectTiming, source: CardSource) {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing !== EffectTiming.None) return effects;
    effects.push(
      staticModifier({
        source,
        effectKey: "BT25-074/inherited-opponent-turn-keywords",
        description:
          "[Opponent's Turn] This Digimon with [Chaosmon] in its name or [D-Brigade]/[ACCEL] gains Reboot and Blocker.",
        isInherited: true,
        when: (ctx) => {
          if (source.isOwnersTurn()) return false;
          const host = source.permanent();
          if (host?.topCard === undefined) return false;
          const definition = ctx.game.definitionOf(host.topCard);
          return (
            definition.nameEn.includes("Chaosmon") ||
            cardHasTrait(definition, "D-Brigade") ||
            cardHasTrait(definition, "ACCEL")
          );
        },
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.grantKeyword(host.permanentId, "Reboot", EffectDuration.Permanent);
          ctx.fx.grantKeyword(host.permanentId, "Blocker", EffectDuration.Permanent);
        },
      }),
    );
    return effects;
  },
};

registerCard(module);
export default module;
