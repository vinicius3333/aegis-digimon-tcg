import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
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
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              faceUp: true,
            },
            unit: "security",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              faceUp: true,
            },
            unit: "security",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "any",
            excludeSelf: true,
            kind: ["Digimon"],
          },
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
              optional: true,
              condition: {
                kind: "triggerRemovalCause",
                removalCause: "byBattle",
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Rule",
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
          grant: "trait",
          tokens: ["Insectoid"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Royal Base"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT18-056", compiled);
