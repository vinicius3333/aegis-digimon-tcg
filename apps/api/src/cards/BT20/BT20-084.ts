import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Sistermon Ciel"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              into: {
                cardId: "BT20-084",
                controller: "mine",
                kind: ["Digimon"],
                zone: "trash",
              },
              from: ["trash"],
              payCost: false,
              ignoreRequirements: true,
              optional: true,
            },
          ],
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "OnPlay",
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
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
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
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "EndOfAllTurns",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          fromDigivolutionTop: true,
          toTop: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Sistermon Ciel"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-084", compiled);
