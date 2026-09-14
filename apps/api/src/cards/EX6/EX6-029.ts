import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for EX6-029.
// SecurityManipulation uses `leaveCount: 4`, not `amount: null` + `until:
// {securityCount: 4}` (an unread shape): the printed text is "trash cards from the
// top of your opponent's security stack UNTIL IT HAS 4 LEFT" (packages/shared
// cards.json), which is exactly what the interpreter's leaveCount already computes
// (`max(0, security.length - leaveCount)`). `until` is a re-encoding of a concept the
// engine already reads under a different key, not a new capability.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDNADigivolve",
          raw: "＜Blast DNA Digivolve ([Angewomon] + [LadyDevimon])＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may play 1 level 5 or lower Digimon card with the [Angel]/[Archangel]/[Fallen Angel] trait from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Angel", "Archangel", "Fallen Angel"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, if DNA digivolving, place 1 other Digimon at the bottom of its owner's security stack, and trash cards from the top of your opponent's security stack until it has 4 left.",
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              excludeSelf: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["battleArea"],
          toTop: false,
          ownerSecurity: true,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
        {
          effectTextPart:
            "Then, if DNA digivolving, place 1 other Digimon at the bottom of its owner's security stack, and trash cards from the top of your opponent's security stack until it has 4 left.",
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          leaveCount: 4,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may play 1 level 5 or lower Digimon card with the [Angel]/[Archangel]/[Fallen Angel] trait from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Angel", "Archangel", "Fallen Angel"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, if DNA digivolving, place 1 other Digimon at the bottom of its owner's security stack, and trash cards from the top of your opponent's security stack until it has 4 left.",
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              excludeSelf: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["battleArea"],
          toTop: false,
          ownerSecurity: true,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
        {
          effectTextPart:
            "Then, if DNA digivolving, place 1 other Digimon at the bottom of its owner's security stack, and trash cards from the top of your opponent's security stack until it has 4 left.",
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          leaveCount: 4,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-029", compiled);
