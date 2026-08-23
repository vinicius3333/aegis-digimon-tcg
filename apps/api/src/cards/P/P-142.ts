// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 6,
              },
            },
            count: 1,
          },
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Ravemon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by placing this Digimon as the bottom digivolution card of 1 of your Digimon with [Ravemon] in its name",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Ravemon"],
                  match: "name",
                },
              ],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Trash",
              target: {
                filter: {
                  controller: "opponent",
                  zone: "hand",
                },
                count: 1,
              },
              chooser: "opponent",
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Pinamon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-142", compiled);
