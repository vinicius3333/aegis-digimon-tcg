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
            digivolutionStackNameOrTrait: [{ tokens: ["Gammamon"], match: "nameExact" }],
          },
          raw: "when you attack with a Digimon that has [Gammamon] in its digivolution cards",
          actions: [
            {
              kind: "GainKeyword",
              target: {
                sourceRef: "triggerSubject",
                filter: { controller: "mine", kind: ["Digimon"] },
                count: 1,
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: 1,
                raw: "＜Security Attack +1＞",
              },
              duration: "forTheTurn",
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

registerIrCard("P-062", compiled);
