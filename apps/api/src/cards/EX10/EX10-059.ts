// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const paidDeleteActions = [
  {
    kind: "PlaceUnder" as const,
    target: {
      filter: {
        zone: "trash" as const,
        controller: "mine" as const,
        kind: ["Digimon" as const],
        nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" as const }],
      },
      count: 3,
      from: ["trash" as const],
    },
    position: "top" as const,
    optional: true,
    abortOnDecline: true,
  },
  {
    kind: "Delete" as const,
    target: {
      filter: {
        controller: "opponent" as const,
        kind: ["Digimon" as const, "Tamer" as const],
        hasDigivolutionCards: true,
      },
      count: 1,
    },
  },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isOpponentHand: true,
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
            from: ["hand"],
          },
          underFilter: {
            controller: "opponent",
            or: [
              {
                digivolutionBottom: true,
              },
              {
                kind: ["Tamer"],
              },
            ],
          },
          position: "bottom",
        },
        ...paidDeleteActions,
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isOpponentHand: true,
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
            from: ["hand"],
          },
          underFilter: {
            controller: "opponent",
            or: [
              {
                digivolutionBottom: true,
              },
              {
                kind: ["Tamer"],
              },
            ],
          },
          position: "bottom",
        },
        ...paidDeleteActions,
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: {
            copyEffectsFromDigivolution: {
              filter:
                "This Digimon gains all [All Turns] effects on all level 6 [Bagra Army] trait Digimon cards in its digivolution cards",
            },
          },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Bagramon"],
        },
        {
          names: ["DarkKnightmon"],
        },
      ],
      count: 3,
      costReduction: 3,
    },
  ],
};

registerIrCard("EX10-059", compiled);

export { compiled };
