// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX2-044 Beelzemon
// Text: "When this card is trashed from your deck, you may play 1 [Impmon] from your trash
//   without paying its memory cost."
// Text: "[When Digivolving][When Attacking] You may trash the top 2 cards of your deck.
//   Then, delete 1 of your opponent's level 3 or lower Digimon. For every 10 cards in your
//   trash, add 1 to the maximum level of the Digimon you can choose with this effect."
// KB Q3340: "when trashed from the deck" ONLY fires when directly trashed from the deck,
//   NOT when revealed or searched.
// Fixes:
//   - Static trigger replaced with AllTurns SubTrigger "whenTrashedFromDeck" (like BT19-097)
//   - nameOrTrait["Impmon"] corrected to proper tokens/match object
//   - TrashTopDeck made abortOnDecline (if declined, Delete doesn't fire)
//   - CostModifier with invalid costType "level" replaced with scaling on Delete's levelCeiling
//     (new capability — see LANE_E.md)
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Impmon"],
                      match: "name",
                    },
                  ],
                  zone: "trash",
                },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 3,
              },
            },
            count: 1,
          },
          scaling: {
            per: 10,
            filter: {
              controller: "mine",
            },
            unit: "trash",
            levelCeilingAdd: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 3,
              },
            },
            count: 1,
          },
          scaling: {
            per: 10,
            filter: {
              controller: "mine",
            },
            unit: "trash",
            levelCeilingAdd: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-044", compiled);
