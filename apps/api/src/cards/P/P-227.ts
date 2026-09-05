// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-227 Unique Emblem: Primal Impact
// [Main] Reveal top 3 of your deck. Add 1 Digimon with [Tyrannomon] in name or [Reptile]/[Dinosaur]
//   trait AND 1 [LIBERATOR] trait card from them to hand. Return rest to deck bottom.
//   Then place this card in the battle area.
// [Your Turn] When any of your [Ryutaro Williams] are played, <Delay>
//   · 1 of your Digimon may digivolve into a Lv6 or lower [LIBERATOR] trait card from hand
//     with the digivolution cost reduced by 3.
// [Security] Activate this card's [Main] effect.
//
// <Delay> pattern: the SubTrigger grants Delay to this card (the option permanent).
// The Delay payload is a separate Main trigger with keywords:[Delay].
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Tyrannomon"],
                    match: "name",
                  },
                  {
                    tokens: ["Reptile"],
                    match: "trait",
                  },
                  {
                    tokens: ["Dinosaur"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["LIBERATOR"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "YourTurn",
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [
              {
                tokens: ["Ryutaro Williams"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
                nameOrTrait: [
                  {
                    tokens: ["LIBERATOR"],
                    match: "trait",
                  },
                ],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 3,
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
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-227", compiled);
