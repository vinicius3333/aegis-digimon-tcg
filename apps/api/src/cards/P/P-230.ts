// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-230 Unique Emblem: Honeycomb Commander (Option)
// [Main] Reveal the top 3 cards of your deck. Add 1 card with [Royal Base] in
//   its text and 1 [LIBERATOR] trait card among them to your hand. Place the
//   rest at the bottom of your deck in any order. Place this card in the battle
//   area.
// [Your Turn] When any of your [Winr]s are played, <Delay>
//   ・1 of your Digimon may digivolve into a level 6 or lower [LIBERATOR] trait
//   card in the hand with the digivolution cost reduced by 3.
// [Security] Activate this card's [Main] effects.
//
// Q&A (Q5964): "X in its text" = name, traits, effects, etc.
//
// Fixes vs prior IR:
// - [Winr] is a TRAIT, not a name — sourceFilter uses match:"trait".
// - <Delay>: the digivolve body belongs in a separate Main+Delay effect, not
//   inline in the YourTurn SubTrigger. The SubTrigger body only grants <Delay>
//   to self; the digivolve is the Delay-activated effect.
// - RevealAdd tracks taken revealed instances between add slots, so the two
//   entries select distinct cards even when their filters overlap.
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
                nameOrTrait: [
                  {
                    tokens: ["Royal Base"],
                    match: "text",
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
                tokens: ["Winr"],
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

registerIrCard("P-230", compiled);
