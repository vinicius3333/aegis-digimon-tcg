import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
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
            or: [
              {
                excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "traitContains" }],
                nameOrTrait: [{ tokens: ["Beast", "Animal", "Sovereign"], match: "traitContains" }],
              },
              { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          condition: {
            kind: "memoryAtMost",
            controller: "mine",
            value: 4,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-009", compiled);
