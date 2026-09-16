import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
          to: "deckBottom",
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
              superlative: "lowestDP",
            },
            count: 1,
          },
          to: "deckBottom",
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
          optional: true,
          effectTextPart:
            "[All Turns] [Once Per Turn] When Digimon are played or digivolve, you may suspend 1 of your opponent's Digimon and unsuspend this Digimon.",
          sourceFilter: {
            controllerDefault: "any",
            kind: ["Digimon"],
          },
          actions: [
            {
              effectTextPart:
                "[All Turns] [Once Per Turn] When Digimon are played or digivolve, you may suspend 1 of your opponent's Digimon and unsuspend this Digimon.",
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
            {
              effectTextPart:
                "[All Turns] [Once Per Turn] When Digimon are played or digivolve, you may suspend 1 of your opponent's Digimon and unsuspend this Digimon.",
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
            {
              kind: "Return",
              effectTextPart:
                "Then, if played or digivolved by effects, you may return 1 of your opponent's suspended Digimon to the bottom of the deck.",
              target: {
                filter: {
                  controller: "opponent",
                  suspended: true,
                  kind: ["Digimon"],
                },
                count: 1,
              },
              to: "deckBottom",
              condition: {
                kind: "triggerPlayedOrDigivolvedByEffect",
                raw: "played or digivolved by effects",
              },
              optional: true,
            },
          ],
          oncePerTurnKey: "entry-response",
        },
        {
          kind: "SubTrigger",
          event: "whenAnyDigivolves",
          optional: true,
          effectTextPart:
            "[All Turns] [Once Per Turn] When Digimon are played or digivolve, you may suspend 1 of your opponent's Digimon and unsuspend this Digimon.",
          sourceFilter: {
            controllerDefault: "any",
            kind: ["Digimon"],
          },
          actions: [
            {
              effectTextPart:
                "[All Turns] [Once Per Turn] When Digimon are played or digivolve, you may suspend 1 of your opponent's Digimon and unsuspend this Digimon.",
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
            {
              effectTextPart:
                "[All Turns] [Once Per Turn] When Digimon are played or digivolve, you may suspend 1 of your opponent's Digimon and unsuspend this Digimon.",
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
            {
              kind: "Return",
              effectTextPart:
                "Then, if played or digivolved by effects, you may return 1 of your opponent's suspended Digimon to the bottom of the deck.",
              target: {
                filter: {
                  controller: "opponent",
                  suspended: true,
                  kind: ["Digimon"],
                },
                count: 1,
              },
              to: "deckBottom",
              condition: {
                kind: "triggerPlayedOrDigivolvedByEffect",
                raw: "played or digivolved by effects",
              },
              optional: true,
            },
          ],
          oncePerTurnKey: "entry-response",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Imperialdramon: Dragon Mode"],
      cost: 1,
      isAlternate: true,
    },
    {
      level: 5,
      traits: ["Hero"],
      cost: 5,
      isAlternate: true,
    },
  ],
};

registerIrCard("AD1-024", compiled);
