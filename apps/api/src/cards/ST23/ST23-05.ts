import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
      optional: true,
      sharedUseKey: "security-placement",
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
      optional: true,
      sharedUseKey: "security-placement",
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

export { compiled };
