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
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 1,
            bindAs: "boostedDigimon",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "boostedDigimon",
          },
          amount: 2000,
          duration: "untilYourTurnEnd",
        },
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          on: {
            filter: {},
            count: 1,
            fromSelectionRef: "boostedDigimon",
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: { op: "eq", value: 3 },
                },
                count: 1,
              },
              to: "hand",
            },
          ],
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
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

registerIrCard("BT6-096", compiled);
