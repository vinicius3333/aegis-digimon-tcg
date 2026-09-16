import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "StartOfOpponentsMainPhase",
      actions: [
        {
          kind: "Attack",
          drainTimingWindowDuringAttack: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            chooser: "opponent",
          },
          optional: true,
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Dramon", "Examon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By suspending 1 of your Digimon with [Dramon] or [Examon] in its name",
          },
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "StartOfOpponentsMainPhase",
      actions: [
        {
          kind: "Attack",
          drainTimingWindowDuringAttack: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            chooser: "opponent",
          },
          optional: true,
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Dramon", "Examon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By suspending 1 of your Digimon with [Dramon] or [Examon] in its name",
          },
          abortOnDecline: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Wingdramon"],
      cost: 3,
      isAlternate: true,
    },
    {
      names: ["Groundramon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX3-024", compiled);
