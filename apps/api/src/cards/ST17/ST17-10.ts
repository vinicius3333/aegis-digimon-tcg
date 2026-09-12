import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST17-10 Henry Wong
// effectText:
//   [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
//   [Main] By placing this Tamer and 1 [Gargomon] and 1 [Rapidmon] from your trash in any
//     order as one of your [Terriermon]'s bottom digivolution cards, that Digimon may
//     digivolve into [MegaGargomon] in the hand for a digivolution cost of 4, ignoring its
//     digivolution requirements. If this effect digivolved, that Digimon gains <Rush> for the turn.
//   KB Q835: player may pay the cost but then choose not to digivolve.
//   KB Q836: all 3 cards (Tamer + Gargomon + Rapidmon) go under a SINGLE [Terriermon].
//
// Processing placements resolve as a leading CostGatedBlock, independently of optional evolution.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "compound",
            orderPlacedCards: true,
            costs: [
              {
                kind: "place",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Tamer"],
                    isSelfRef: true,
                  },
                  count: 1,
                },
                raw: "By placing this Tamer and 1 [Gargomon] and 1 [Rapidmon] from your trash in any order as the bottom digivolution cards of one of your [Terriermon]",
                underFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Terriermon"], match: "nameExact" }],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: "target",
                targetIsPermanent: true,
                bindHostAs: "henryTarget",
              },
              {
                kind: "place",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Gargomon"], match: "nameExact" }],
                  },
                  count: 1,
                  from: ["trash"],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: { filter: { boundRef: "henryTarget" }, count: 1 },
              },
              {
                kind: "place",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Rapidmon"], match: "nameExact" }],
                  },
                  count: 1,
                  from: ["trash"],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: { filter: { boundRef: "henryTarget" }, count: 1 },
              },
            ],
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Terriermon"], match: "nameExact" }],
                },
                count: 1,
                fromSelectionRef: "henryTarget",
              },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["MegaGargomon"], match: "nameExact" }],
              },
              payCost: true,
              from: ["hand"],
              costOverride: 4,
              ignoreRequirements: true,
              optional: true,
            },
          ],
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            fromSelectionRef: "henryTarget",
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "ifThisEffectDigivolved",
            raw: "this effect digivolved",
          },
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST17-10", compiled);
