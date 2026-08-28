// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              zone: "breedingArea",
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            targetBreeding: true,
          },
          into: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Lucemon"], match: "nameExact" }],
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Option"],
            },
            count: 1,
          },
          cost: {
            kind: "digivolve",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }],
              },
              count: 1,
            },
            into: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }],
            },
            from: ["trash"],
            costReduction: 3,
            raw: "By digivolving 1 of your Digimon with [Lucemon] in its name into a Digimon card with [Lucemon] in its name from your trash with the digivolution cost reduced by 3",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-100", compiled);
