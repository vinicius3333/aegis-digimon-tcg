// Hand-authored override — do not regenerate.
// OnPlay+WhenDigivolving: 3 separate bottom PlaceUnder actions (1 per named card from trash).
// Errata (2022-09-05): Fujinmon (not Fuijinmon). Source zone: trash (per text and errata).
// GainMemory scaling: count all cards placed by this effect (no controllerDefault restriction).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Raijinmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          position: "bottom",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Fujinmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          position: "bottom",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Suijinmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          position: "bottom",
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            unit: "placedCards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Raijinmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          position: "bottom",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Fujinmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          position: "bottom",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Suijinmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          position: "bottom",
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            unit: "placedCards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfDigivolutionStackDistinctColorCount",
            filter: { levels: [6] },
            op: "gte",
            value: 3,
          },
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          condition: {
            kind: "selfDigivolutionStackDistinctColorCount",
            filter: { levels: [6] },
            op: "gte",
            value: 4,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-067", compiled);
