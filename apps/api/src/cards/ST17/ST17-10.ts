// @ts-nocheck
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
// Audit fixes:
// - [Main] Digivolve cost: was only placing this Tamer (isSelfRef). Now places THIS Tamer +
//   1 [Gargomon] + 1 [Rapidmon] all from trash, under the same [Terriermon].
// - [Main] Digivolve target: now requires nameOrTrait filter for [Terriermon].
// - The placed cards go as bottom digivolution cards of the chosen [Terriermon] — encoded with
//   "underTarget" specifying the Terriermon as the destination Digimon.
// - Digivolve into [MegaGargomon] at cost 4, ignoring requirements (already correct).
// - GainKeyword Rush conditioned on this effect digivolving (already encoded, kept).
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
          // KB Q836: all 3 cards placed under one [Terriermon]; choice of the Terriermon is
          // made first, then all 3 go under it as bottom digivolution cards.
          kind: "Digivolve",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Terriermon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            bindAs: "terriermon",
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["MegaGargomon"],
                match: "name",
              },
            ],
          },
          payCost: true,
          from: ["hand"],
          costOverride: 4,
          ignoreRequirements: true,
          optional: true,
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "place",
                target: { filter: { isSelfRef: true }, count: 1, from: ["battleArea"] },
                targetIsPermanent: true,
                destination: "digivolutionStack",
                host: "target",
                underFilter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Terriermon"], match: "name" }],
                },
                position: "bottom",
              },
              {
                kind: "place",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "trash",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Gargomon"], match: "name" }],
                  },
                  count: 1,
                  from: ["trash"],
                },
                destination: "digivolutionStack",
                host: "target",
                underFilter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Terriermon"], match: "name" }],
                },
                position: "bottom",
              },
              {
                kind: "place",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "trash",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Rapidmon"], match: "name" }],
                  },
                  count: 1,
                  from: ["trash"],
                },
                destination: "digivolutionStack",
                host: "target",
                underFilter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Terriermon"], match: "name" }],
                },
                position: "bottom",
              },
            ],
            raw: "By placing this Tamer and 1 [Gargomon] and 1 [Rapidmon] from your trash in any order as one of your [Terriermon]'s bottom digivolution cards",
          },
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: 1,
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
