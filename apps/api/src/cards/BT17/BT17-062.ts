// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
                match: "name",
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
                filter: { nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "name" }] },
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
