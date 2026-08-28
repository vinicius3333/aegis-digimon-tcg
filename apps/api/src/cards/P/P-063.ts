// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            digivolutionStackNameOrTrait: [{ tokens: ["Angoramon"], match: "nameExact" }],
          },
          raw: "when you attack with a Digimon that has [Angoramon] in its digivolution cards",
          actions: [
            {
              kind: "ModifyDP",
              target: {
                sourceRef: "triggerSubject",
                filter: { controller: "mine", kind: ["Digimon"] },
                count: 1,
              },
              amount: 3000,
              duration: "forTheTurn",
              continuous: false,
              cost: {
                kind: "suspend",
                target: {
                  filter: { isSelfRef: true },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-063", compiled);
