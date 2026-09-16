import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Dorugoramon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          from: ["hand"],
          costOverride: 4,
          ignoreRequirements: true,
          optional: true,
          condition: {
            kind: "allOf",
            conditions: [
              {
                kind: "selfDigivolutionStackHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "nameExact" }] },
              },
              {
                kind: "opponentHas",
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
              },
            ],
            raw: "[Kosuke Kisakata] is in this Digimon's digivolution cards and your opponent has a level 6 or higher Digimon",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Dorimon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-062", compiled);
