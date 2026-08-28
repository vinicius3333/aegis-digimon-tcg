// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override. KB Q1036: "give THAT Digimon +2000 DP" applies to the
// attacking red Digimon, and the player-target condition is checked at declaration.
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
            colors: ["Red"],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                sourceRef: "triggerSubject",
                filter: {},
                count: 1,
              },
              amount: 2000,
              duration: "forTheTurn",
              condition: {
                kind: "attackTargetsPlayer",
              },
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
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
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-084", compiled);
