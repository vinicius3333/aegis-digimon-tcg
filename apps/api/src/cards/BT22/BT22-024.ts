// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      isFromHand: true,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [
            {
              tokens: ["Yao Qinglan"],
              match: "name",
            },
          ],
        },
        raw: "you have [Yao Qinglan]",
      },
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Shellmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          underFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Sangomon"],
                match: "name",
              },
            ],
          },
          position: "bottom",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Sangomon"],
                  match: "name",
                },
              ],
              sameAsPlaceUnderTarget: true,
            },
            count: 1,
          },
          into: {
            isSelfRef: true,
          },
          from: ["hand"],
          payCost: 3,
          ignoreRequirements: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.4 w/[Aqua]/[Sea Animal] in any trait)＞",
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Aqua", "Sea Animal"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-024", compiled);
