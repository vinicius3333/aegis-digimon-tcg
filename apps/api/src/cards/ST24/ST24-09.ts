import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon or Tamers.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may place the top card of your deck face down under any of your [DATA SQUAD] trait Tamers.",
          kind: "PlaceUnder",
          fromDeckTop: true,
          target: {
            filter: {
              controller: "mine",
            },
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [
              {
                tokens: ["DATA SQUAD"],
                match: "trait",
              },
            ],
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon or Tamers.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may place the top card of your deck face down under any of your [DATA SQUAD] trait Tamers.",
          kind: "PlaceUnder",
          fromDeckTop: true,
          target: {
            filter: {
              controller: "mine",
            },
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [
              {
                tokens: ["DATA SQUAD"],
                match: "trait",
              },
            ],
          },
          optional: true,
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
      level: 3,
      traits: ["DATA SQUAD"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST24-09", compiled);
