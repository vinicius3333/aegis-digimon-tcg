// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: true,
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              or: [
                {
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Royal Knight"],
                      match: "trait",
                    },
                  ],
                },
                {
                  kind: ["Tamer"],
                  colors: ["Blue"],
                },
              ],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: true,
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              or: [
                {
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Royal Knight"],
                      match: "trait",
                    },
                  ],
                },
                {
                  kind: ["Tamer"],
                  colors: ["Blue"],
                },
              ],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            or: [
              {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Royal Knight"],
                    match: "trait",
                  },
                ],
              },
              {
                kind: ["Tamer"],
                colors: ["Blue"],
              },
            ],
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  digivolutionCards: "none",
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              to: "hand",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "bt13-030-return",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-030", compiled);
