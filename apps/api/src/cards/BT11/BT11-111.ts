import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] },
            count: 4,
            upTo: true,
            from: ["trash"],
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          optional: true,
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: {
            kind: "selfDigivolutionStackCountAtLeast",
            filter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] },
            count: 8,
            raw: "there are 8 or more [Vemmon] in this Digimon's digivolution cards",
          },
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
              cost: {
                kind: "return",
                target: {
                  filter: {
                    zone: "digivolutionCards",
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }],
                    hostFilter: { isSelfRef: true },
                  },
                  count: 4,
                  from: ["digivolutionCards"],
                },
                raw: "by placing 4 [Vemmon] from this Digimon's digivolution cards at the bottom of their owners' decks",
                to: "deckBottom",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Snatchmon"], cost: 9, isAlternate: true }],
};
registerIrCard("BT11-111", compiled);
