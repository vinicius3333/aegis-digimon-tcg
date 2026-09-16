import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Training",
          raw: "＜Training＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may place 1 card in your hand face down as this Digimon's bottom digivolution card. For each of this Digimon's face-down digivolution cards, suspend 1 of your opponent's Digimon.",
          kind: "PlaceUnder",
          faceDown: true,
          from: ["hand"],
          position: "bottom",
          target: {
            filter: {
              controller: "mine",
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may place 1 card in your hand face down as this Digimon's bottom digivolution card. For each of this Digimon's face-down digivolution cards, suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              isSelfRef: true,
              faceDown: true,
            },
            unit: "digivolutionCards",
          },
        },
        {
          effectTextPart: "Then, 1 of your Digimon may attack your opponent's Digimon.",
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          attackPlayer: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may place 1 card in your hand face down as this Digimon's bottom digivolution card. For each of this Digimon's face-down digivolution cards, suspend 1 of your opponent's Digimon.",
          kind: "PlaceUnder",
          faceDown: true,
          from: ["hand"],
          position: "bottom",
          target: {
            filter: {
              controller: "mine",
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may place 1 card in your hand face down as this Digimon's bottom digivolution card. For each of this Digimon's face-down digivolution cards, suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              isSelfRef: true,
              faceDown: true,
            },
            unit: "digivolutionCards",
          },
        },
        {
          effectTextPart: "Then, 1 of your Digimon may attack your opponent's Digimon.",
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          attackPlayer: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
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
      traits: ["DM"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX9-039", compiled);
