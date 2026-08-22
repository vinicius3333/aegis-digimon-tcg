// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-229 Unique Emblem: Narrative Ronde — hand-fixed IR.
// [Main] Reveal the top 3 cards of your deck. Add 1 [Puppet] trait Digimon card and
//   1 [LIBERATOR] trait card among them to the hand. Return the rest to the bottom of the deck.
//   Then, place this card in the battle area.
// [Your Turn] When any of your [Mirai Kinosaki]s are played, <Delay>
//   · 1 of your Digimon may digivolve into a level 6 or lower [LIBERATOR] trait card
//     in the hand with the digivolution cost reduced by 3.
// [Security] Activate this card's [Main] effect.
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
                    tokens: ["Puppet"],
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
      // [Your Turn] When any of your [Mirai Kinosaki]s are played, <Delay>
      // The Delay action gates the Digivolve: when Mirai Kinosaki is played, the player
      // gains the Delay option; during their main phase they may activate the digivolve.
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Mirai Kinosaki"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
              keyword: {
                keyword: "Delay",
                raw: "＜Delay＞",
              },
              duration: "permanent",
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: {
            controllerDefault: "mine",
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }],
          },
          from: ["hand"],
          reduceCost: 3,
          optional: true,
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

registerIrCard("P-229", compiled);
