import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "DigivolveViaPlacement",
          placeCost: {
            kind: "placeFromTrash",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Beetlemon", "MetalKabuterimon"],
                    match: "name",
                  },
                ],
              },
              count: 2,
              requiredNamesExact: ["Beetlemon", "MetalKabuterimon"],
            },
            raw: "By placing 1 [Beetlemon] and 1 [MetalKabuterimon] from your trash under 1 of your black or yellow Tamers, that Tamer digivolves into this card for digivolution cost of 3, ignoring its digivolution requirements.",
            hostFilter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Black", "Yellow"],
            },
            destination: "digivolutionStack",
            position: "bottom",
          },
          into: {
            filter: { isSelfRef: true },
            count: 1,
          },
          cost: 3,
          ignoreDigivolutionRequirements: true,
          raw: "By placing 1 [Beetlemon] and 1 [MetalKabuterimon] from your trash under 1 of your black or yellow Tamers, that Tamer digivolves into this card for digivolution cost of 3, ignoring its digivolution requirements.",
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Hybrid"],
      cost: 3,
      isAlternate: true,
      baseColors: ["Black", "Yellow"],
    },
  ],
};

registerIrCard("BT18-070", compiled);
