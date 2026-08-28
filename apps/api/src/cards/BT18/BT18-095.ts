// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
              ],
            },
            count: 5,
            upTo: true,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
          },
          optional: true,
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["EmperorGreymon"],
                match: "name",
              },
            ],
          },
          payCost: false,
          from: ["hand", "trash"],
          ignoreRequirements: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              hasInheritedEffects: true,
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-095", compiled);
