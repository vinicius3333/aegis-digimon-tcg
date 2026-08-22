// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.4 or lower w/[Aqua]/[Sea Animal] in any trait or w/[TB] trait)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "trait",
                  },
                  {
                    tokens: ["TB"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 level 6 or lower card with [Aqua] or [Sea Animal] in any of its traits or the [TB] trait from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "trait",
                  },
                  {
                    tokens: ["TB"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 level 6 or lower card with [Aqua] or [Sea Animal] in any of its traits or the [TB] trait from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Aquatic"],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.4 or lower w/[Aqua]/[Sea Animal] in any trait or w/[TB] trait)＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Aquatic", "Shambala"],
      cost: 3,
      isAlternate: true,
    },
  ],
  assemblyRequirement: [
    {
      materials: [
        {
          count: 1,
          nameOrTrait: [
            {
              tokens: ["Aqua", "Sea Animal"],
              match: "trait",
            },
            {
              tokens: ["TB"],
              match: "trait",
            },
          ],
          levelMax: 4,
        },
      ],
      reduceCost: 2,
    },
  ],
};

registerIrCard("EX12-031", compiled);
