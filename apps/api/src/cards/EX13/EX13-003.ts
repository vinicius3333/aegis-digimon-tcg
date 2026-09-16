import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: {
            kind: "triggerRemovedSecuritySeat",
            seat: "mine",
          },
          raw: "When your security stack is removed from, this Digimon may digivolve into a Digimon card with [Kentaurosmon] in its name or the [Holy Beast] trait in the hand with the cost reduced by 1.",
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Kentaurosmon"],
                    match: "name",
                  },
                  {
                    tokens: ["Holy Beast"],
                    match: "trait",
                  },
                ],
              },
              from: ["hand"],
              reduceCost: 1,
              payCost: true,
              optional: true,
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

registerIrCard("EX13-003", compiled);
