import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Diaboromon"],
          count: 1,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Diaboromon"],
          count: 1,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [
              {
                tokens: ["Diaboromon"],
                match: "text",
              },
            ],
          },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "mine",
                    excludeSelf: true,
                    nameOrTrait: [{ tokens: ["Diaboromon"], match: "nameExact" }],
                  },
                  count: 1,
                },
                raw: "by deleting 1 of your other [Diaboromon]",
              },
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
  digivolutionRequirement: [
    {
      names: ["Keramon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-052", compiled);
