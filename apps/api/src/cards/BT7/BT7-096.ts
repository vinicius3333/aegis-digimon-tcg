// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
            bindAs: "chosenHost",
          },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              zone: "digivolutionCards",
              kind: ["Tamer"],
              hostFilter: { boundRef: "chosenHost" },
            },
            orFilters: [
              {
                controller: "mine",
                zone: "digivolutionCards",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Hybrid"],
                    match: "traitContains",
                  },
                ],
                hostFilter: { boundRef: "chosenHost" },
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
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
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Koji Minamoto"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-096", compiled);
