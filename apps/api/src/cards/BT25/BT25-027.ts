import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "by trashing the bottom face-down card from under any of your Tamers",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "by trashing the bottom face-down card from under any of your Tamers",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [],
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "by trashing the bottom face-down card from under any of your Tamers, it doesn't leave",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Gaogamon"],
                match: "name",
              },
              {
                tokens: ["DATA SQUAD"],
                match: "trait",
              },
            ],
          },
          actions: [],
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "by trashing the bottom face-down card from under any of your Tamers, it doesn't leave",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["DATA SQUAD"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-027", compiled);
