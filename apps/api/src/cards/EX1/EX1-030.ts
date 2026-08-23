// @ts-nocheck
// Hand-authored override for EX1-030.
// runtime-effect fix: the conditional [When Attacking] effect also lowers ALL opponent
// Security Digimon by -3000 for the turn ("1 of your opponent's Digimon AND all of
// your opponent's Security Digimon"). Added the ModifySecurityDP half under the same
// securityAtLeast:3 condition.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
          condition: {
            kind: "securityAtLeast",
            value: 3,
          },
        },
        {
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -3000,
          duration: "forTheTurn",
          condition: {
            kind: "securityAtLeast",
            value: 3,
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: {
            kind: "triggerSecurityIsYours",
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -2000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-030", compiled);
