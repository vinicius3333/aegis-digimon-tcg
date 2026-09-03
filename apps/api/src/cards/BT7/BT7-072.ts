import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              payCost: false,
              from: ["trash"],
              optional: true,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  zone: "trash",
                  nameOrTrait: [{ tokens: ["Eyesmon: Scatter Mode"], match: "nameExact" }],
                },
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            unit: "trash",
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Eyesmon: Scatter Mode"], match: "nameExact" }] },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-072", compiled);
