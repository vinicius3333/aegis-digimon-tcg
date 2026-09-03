import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Return performs the printed rules cleanup for attached digivolution cards. It must
// not be modeled as TrashDigivolution because Q1399 says that cleanup does not trigger
// effects watching for a digivolution card trashed by an effect.
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
              kind: "SelectBind",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: { op: "eq", value: 3 },
                },
                count: 1,
                bindAs: "forbiddenTridentTarget",
              },
            },
            {
              kind: "Return",
              target: { filter: {}, count: 1, fromSelectionRef: "forbiddenTridentTarget" },
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
