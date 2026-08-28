// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon", "Tamer"],
              },
              count: 1,
            },
            raw: "by suspending 1 of their Digimon or Tamers",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
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
                nameOrTrait: [
                  {
                    tokens: ["Imperialdramon: Fighter Mode"],
                    match: "name",
                  },
                ],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
              condition: {
                kind: "allOf",
                conditions: [
                  {
                    kind: "youHave",
                    filter: {
                      controllerDefault: "mine",
                      kind: ["Tamer"],
                    },
                    raw: "you have a Tamer",
                  },
                  {
                    kind: "triggerPlayedOrDigivolvedByEffect",
                    raw: "played or digivolved by an effect",
                  },
                ],
              },
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
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
                nameOrTrait: [
                  {
                    tokens: ["Imperialdramon: Fighter Mode"],
                    match: "name",
                  },
                ],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
              condition: {
                kind: "allOf",
                conditions: [
                  {
                    kind: "youHave",
                    filter: {
                      controllerDefault: "mine",
                      kind: ["Tamer"],
                    },
                    raw: "you have a Tamer",
                  },
                  {
                    kind: "triggerPlayedOrDigivolvedByEffect",
                    raw: "digivolved by an effect",
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Paildramon", "Dinobeemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-028", compiled);
export { compiled };
