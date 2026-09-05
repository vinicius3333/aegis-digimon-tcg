// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
          sourceFilter: {
            controllerDefault: "any",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
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
            },
            {
              kind: "Return",
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
          sourceFilter: {
            controllerDefault: "any",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
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
            },
            {
              kind: "Return",
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
