// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "eq",
                relativeTo: "placedSecurityCard",
              },
              levelEq: "placedSecurityCardLevel",
            },
            count: "all",
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                hostFilter: {
                  isSelfRef: true,
                },
              },
              count: 1,
              from: ["digivolutionCards"],
            },
            raw: "By placing 1 Digimon card from this Digimon's digivolution cards as your bottom security card",
            bindResultAs: "placedSecurityCard",
            destination: "security",
            position: "bottom",
            storeAs: "placedSecurityCardLevel",
          },
          raw: "By placing 1 Digimon card from this Digimon's digivolution cards as your bottom security card, delete all opponent Digimon with the same level as the placed card.",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "eq",
                relativeTo: "placedSecurityCard",
              },
              levelEq: "placedSecurityCardLevel",
            },
            count: "all",
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                hostFilter: {
                  isSelfRef: true,
                },
              },
              count: 1,
              from: ["digivolutionCards"],
            },
            raw: "By placing 1 Digimon card from this Digimon's digivolution cards as your bottom security card",
            bindResultAs: "placedSecurityCard",
            destination: "security",
            position: "bottom",
            storeAs: "placedSecurityCardLevel",
          },
          raw: "By placing 1 Digimon card from this Digimon's digivolution cards as your bottom security card, delete all opponent Digimon with the same level as the placed card.",
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
          event: "whenAttacking",
          sourceFilter: {
            controller: "any",
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
              cost: {
                kind: "securityToHand",
                controller: "mine",
                count: 1,
                raw: "by adding the top card of your security stack to the hand",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Koji Minamoto"],
      cost: 5,
      isAlternate: true,
      minTraitStackCount: 5,
      minTraitStackTraits: ["Hybrid"],
    },
  ],
};

registerIrCard("BT18-042", compiled);
