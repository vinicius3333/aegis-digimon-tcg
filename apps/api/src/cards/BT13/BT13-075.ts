// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostGte: 10,
            },
            count: "all",
          },
          restriction: "attackPlayers",
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["X Antibody", "Royal Knight"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 Digimon card with the [X Antibody] or [Royal Knight] trait from your trash as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: false,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostGte: 10,
            },
            count: "all",
          },
          restriction: "attackPlayers",
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["X Antibody", "Royal Knight"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 Digimon card with the [X Antibody] or [Royal Knight] trait from your trash as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: false,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "return",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                nameOrTrait: [{ tokens: ["X Antibody", "Royal Knight"], match: "trait" }],
              },
              count: 1,
            },
            to: "deckBottom",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-075", compiled);
