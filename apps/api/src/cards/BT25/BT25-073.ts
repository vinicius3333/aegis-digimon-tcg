import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
