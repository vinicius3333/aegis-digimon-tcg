import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Reboot",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Blocker",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Evade",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "WhenDigivolving",
      optional: true,
      actions: [
        {
          effectTextPart:
            "[When Digivolving] [When Attacking] [Once Per Turn] You may return 1 of your opponent's level 5 or lower Digimon to the hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
        {
          effectTextPart:
            "Then, by trashing the bottom face-down card under any of your Tamers, return 1 of your opponent's lowest level Digimon to the hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 1,
            raw: "by trashing the bottom face-down card under any of your Tamers",
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
      optional: true,
      actions: [
        {
          effectTextPart:
            "[When Digivolving] [When Attacking] [Once Per Turn] You may return 1 of your opponent's level 5 or lower Digimon to the hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
        {
          effectTextPart:
            "Then, by trashing the bottom face-down card under any of your Tamers, return 1 of your opponent's lowest level Digimon to the hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 1,
            raw: "by trashing the bottom face-down card under any of your Tamers",
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
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          optional: true,
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
          ],
          raw: "When effects add cards to your opponent's hand, this Digimon may unsuspend.",
        },
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: {
            controller: "mine",
            kind: ["Tamer"],
          },
          optional: true,
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
          ],
          raw: "When effects trash cards from under your Tamers, this Digimon may unsuspend.",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Gaogamon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["DATA SQUAD"],
      cost: 3,
      isAlternate: true,
      level: 5,
    },
  ],
};

registerIrCard("BT25-029", compiled);
