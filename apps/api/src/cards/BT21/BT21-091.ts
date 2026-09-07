import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Preserved override (no AUTO-GENERATED header → the generator will not overwrite it).
// The [Main] effect's cost is trashing 1 [Hybrid] card; once paid, "Then, place this
// card in the battle area" is a forced consequence — the Draw carries abortOnDecline,
// so PlaceInBattleAreaSelf only runs when the cost was paid and must not be optional.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              hasInheritedEffects: true,
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer with inherited effects",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Hybrid"],
                    match: "trait",
                  },
                ],
                zone: "hand",
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Hybrid] trait from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            hasInheritedEffects: true,
            controller: "mine",
            kind: ["Tamer"],
          },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Tamer"] }, count: 1 },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              hasInheritedEffects: true,
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-091", compiled);
