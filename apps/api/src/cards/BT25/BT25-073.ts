import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT25-073 Dragomon
// ＜Jamming＞
// [On Play] [When Digivolving] By trashing 1 of your Digimon's link cards, you may
//   play or use 1 [TS] trait card with a play or use cost of 5 or less from your
//   hand without paying the cost.
// [inherited] [All Turns] By trashing 1 of its link cards, this Digimon doesn't leave play.
//
// Audit fixes:
// 1. Cost filter must target a link card (zone:"linked") of a Digimon — not any Digimon.
//    zone:"linked" is a new vocabulary; see LANE_C.md for LinkedZone capability spec.
//    The cost raw field describes the intent; the filter is the faithful shape.
// 2. "play or use" is represented by a Modal choosing between a free permanent play and a free
//    Option use, both restricted to TS cards with cost 5 or less.
// 3. The inherited Replacement cost targets "its link cards" — the linked zone of the
//    Digimon that would leave play (self-ref Digimon's linked cards).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a TS Digimon or Tamer", "Use a TS Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                    playCostLte: 5,
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: false,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                  playCostLte: 5,
                },
                from: ["hand"],
                payCost: false,
              },
            ],
          ],
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                zone: "linked",
              },
              count: 1,
            },
            raw: "By trashing 1 of your Digimon's link cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a TS Digimon or Tamer", "Use a TS Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                    playCostLte: 5,
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: false,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                  playCostLte: 5,
                },
                from: ["hand"],
                payCost: false,
              },
            ],
          ],
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                zone: "linked",
              },
              count: 1,
            },
            raw: "By trashing 1 of your Digimon's link cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          raw: "When this Digimon would leave the battle area, by trashing 1 of its link cards, it doesn't leave.",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [],
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "linked",
              },
              count: 1,
            },
            raw: "by trashing 1 of its link cards, it doesn't leave",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      colors: ["Black"],
      cost: 3,
      isAlternate: false,
    },
    {
      level: 4,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-073", compiled);
