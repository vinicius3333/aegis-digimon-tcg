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
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          bindAs: "chosenDigimon",
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
              relativeTo: { attr: "dp", op: "lte", selectionRef: "chosenDigimon" },
            },
            count: 1,
          },
          to: "hand",
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                controller: "mine",
                zone: "digivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Leopardmon: Leopard Mode"],
                    match: "nameExact",
                  },
                ],
              },
              count: 1,
              topCardOnly: true,
            },
            raw: "by returning the top card of one of your [Leopardmon: Leopard Mode] to the hand",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
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

registerIrCard("BT13-107", compiled);
