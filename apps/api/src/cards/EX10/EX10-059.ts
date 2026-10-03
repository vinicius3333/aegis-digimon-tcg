import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const paidDeleteActions = [
  {
    effectTextPart:
      "Then, by placing 3 [Bagra Army] trait Digimon cards from your trash as this Digimon's top digivolution cards, delete 1 of their Digimon or Tamers with cards under it.",
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
          effectTextPart:
            "[On Play] [When Digivolving] Choose 1 card in your opponent's hand without looking and place it as any of their Digimon's bottom digivolution card or under any of their Tamers.",
          kind: "PlaceUnder",
          blind: true,
          target: {
            filter: {
              isOpponentHand: true,
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
            from: ["hand"],
          },
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          position: "bottom",
        },
        ...paidDeleteActions,
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Choose 1 card in your opponent's hand without looking and place it as any of their Digimon's bottom digivolution card or under any of their Tamers.",
          kind: "PlaceUnder",
          blind: true,
          target: {
            filter: {
              isOpponentHand: true,
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
            from: ["hand"],
          },
          underFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
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
          grant: "effects",
          copyTrigger: "AllTurns",
          filter: {
            kind: ["Digimon"],
            levels: [6],
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
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
