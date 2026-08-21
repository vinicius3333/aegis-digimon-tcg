import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-written override for ST23-05 (Habakirimon).
// Fix: placeAsSecurity must place OPPONENT's lowest-DP Digimon onto MY security (toTop:true).
// Phase 13: lowestDP superlative now supported (Plan 13-01, Task 2).
// Recovery clause: "Then, by trashing the top security card of 1 player with the most security
// cards, <Recovery +1>" — the RecoverByTrashingMostSecurity IR action (optional; eligible player =
// security count > 0 AND >= the other's, choose when tied per KB Q6167). The earlier GainKeyword
// Recovery model was WRONG (it granted a permanent Recovery keyword instead of the conditional act).
//   + the trash-most-security/IRecovery block (documented behavior).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
            },
            count: 1,
          },
          raw: "[All Turns] [Once Per Turn] When any of your [Glowing Dawn] trait Digimon would leave the battle area, by trashing your top security card, they don't leave.",
          affectsAll: true,
          cost: {
            kind: "trashSecurityTop",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
          toTop: true,
        },
        {
          kind: "RecoverByTrashingMostSecurity",
          amount: 1,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
          toTop: true,
        },
        {
          kind: "RecoverByTrashingMostSecurity",
          amount: 1,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 3,
      isAlternate: true,
      traits: ["Glowing Dawn"],
    },
  ],
};

registerIrCard("ST23-05", compiled);
