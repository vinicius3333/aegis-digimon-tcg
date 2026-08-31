// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Dark Animal", "SoC"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            countModifier: {
              amount: 2,
              condition: {
                kind: "selfDigivolutionStackHasTrait",
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Eiji Nagasumi"],
                      match: "name",
                    },
                  ],
                },
                raw: "[Eiji Nagasumi] is in this Digimon's digivolution cards",
              },
            },
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                levelComparison: {
                  op: "lte",
                  value: 3,
                  scaling: {
                    per: 1,
                    filter: {
                      controller: "mine",
                      kind: ["Digimon"],
                    },
                    unit: "cards",
                  },
                },
              },
              count: 1,
            },
            raw: "By deleting 1 of your opponent's level 3 or lower Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SetTurnEndMemory",
          minimum: 3,
          raw: "Your turn continues unless your opponent's memory is 3 or more",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-081", compiled);
