import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
            controller: "mine",
          },
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          controller: "opponent",
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            host: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
              },
              count: 1,
            },
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Black"],
                playCostLte: 4,
                nameOrTrait: [
                  {
                    tokens: ["Cyborg", "Machine"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            raw: "By placing 1 black Digimon card with the [Cyborg]/[Machine] trait with a play cost of 4 or less from your hand or trash at the bottom of your Digimon with such trait",
          },
          optional: true,
          abortOnDecline: true,
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

registerIrCard("BT20-086", compiled);
