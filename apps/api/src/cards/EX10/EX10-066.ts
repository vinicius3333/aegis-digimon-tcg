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
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "belphemonHost",
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Belphemon"],
                match: "name",
              },
            ],
          },
          payCost: false,
          from: ["trash"],
          optional: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 6,
            raw: "you have 6 or fewer cards in your hand",
          },
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by placing this Tamer as the bottom digivolution card of any of your Digimon with [Belphemon] in their names",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Belphemon"],
                  match: "name",
                },
              ],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            bindHostAs: "belphemonHost",
          },
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

registerIrCard("EX10-066", compiled);
