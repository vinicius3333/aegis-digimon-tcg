import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["D-Brigade", "ACCEL"],
                    match: "trait",
                  },
                ],
                playCostLte: 12,
              },
              count: 1,
              to: "play",
              costDelta: 5,
              optional: true,
            },
          ],
          rest: "trash",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["D-Brigade", "ACCEL"],
                    match: "trait",
                  },
                ],
                playCostLte: 12,
              },
              count: 1,
              to: "play",
              costDelta: 5,
              optional: true,
            },
          ],
          rest: "trash",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["D-Brigade", "ACCEL"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "digivolve",
              duration: "untilOpponentTurnEnd",
            },
          ],
          raw: "whenPlayed",
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Reboot" },
          duration: "permanent",
          condition: { kind: "selfHasNameContaining", names: ["Chaosmon"] },
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Blocker" },
          duration: "permanent",
          condition: { kind: "selfHasNameContaining", names: ["Chaosmon"] },
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Reboot" },
          duration: "permanent",
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["D-Brigade", "ACCEL"], match: "trait" }] },
          },
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Blocker" },
          duration: "permanent",
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["D-Brigade", "ACCEL"], match: "trait" }] },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 4, colors: ["Black"], cost: 4, isAlternate: false },
    { level: 4, colors: ["Purple"], cost: 4, isAlternate: false },
    {
      level: 4,
      traits: ["D-Brigade", "ACCEL"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-074", compiled);
