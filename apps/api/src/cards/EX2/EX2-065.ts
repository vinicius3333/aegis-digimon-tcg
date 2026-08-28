// @ts-nocheck
// HAND-FIXED IR — the Tamer suspension gates the complete attack-trigger sequence.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
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
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
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
          raw: "When you attack with a Digimon, you may suspend this Tamer",
          actions: [
            {
              kind: "TrashTopDeck",
              controller: "mine",
              amount: 1,
            },
            {
              kind: "Digivolve",
              target: {
                filter: {},
                count: 1,
                sourceRef: "triggerSubject",
              },
              into: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Beelzemon Blast Mode"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["trash"],
              payCost: true,
              costOverride: 3,
              condition: {
                kind: "triggerAttackerMatchesFilter",
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Beelzemon"],
                      match: "nameExact",
                    },
                  ],
                },
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

registerIrCard("EX2-065", compiled);
