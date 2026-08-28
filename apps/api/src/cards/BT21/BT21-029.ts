// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT21-029 Medusamon
// <Security A. +1>, <Progress>
// [When Digivolving][End of Attack][Once Per Turn] You may delete 1 of your opponent's
//   lowest DP Digimon.
// [All Turns][Once Per Turn] When any of your opponent's Digimon are deleted OR their
//   security stack is removed from, they play 1 [Petrification] Token as their Digimon.
//
// KB Q4538: the token of the player that activated this effect is played as opponent's Digimon.
// Audit: dual trigger — onDeletionOf + whenSecurityRemoved both fire the same PlayToken.
export const compiled: CompiledCard = {
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
          keyword: "Progress",
          raw: "＜Progress＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
          optional: true,
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
          event: "onDeletionOf",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "PlayToken",
              token: "Petrification Token",
              amount: 1,
              controller: "mine",
              placedAs: "opponentDigimon",
            },
          ],
          raw: "When any of your opponent's Digimon are deleted, they play 1 Petrification Token",
        },
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: {
            controller: "opponent",
          },
          actions: [
            {
              kind: "PlayToken",
              token: "Petrification Token",
              amount: 1,
              controller: "mine",
              placedAs: "opponentDigimon",
            },
          ],
          raw: "When their security stack is removed from, they play 1 Petrification Token",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, colors: ["Red"], cost: 4 }],
};

registerIrCard("BT21-029", compiled);
