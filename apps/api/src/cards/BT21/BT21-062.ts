// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT21-062";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["Ragnarok Cannon"], match: "name" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }],
              },
              count: 4,
              from: ["trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "By placing 4 cards with [Vemmon] in its text from your trash as this Digimon's bottom digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "return",
                target: {
                  filter: {
                    zone: "digivolutionCards",
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }],
                    isSelfRef: true,
                  },
                  count: 4,
                },
                to: "deckBottom",
                raw: "by returning 4 [Vemmon] from its digivolution cards to the bottom of the deck",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Snatchmon"], cost: 9, isAlternate: true }],
};

registerIrCard(cardId, compiled);
