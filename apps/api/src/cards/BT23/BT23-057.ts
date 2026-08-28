// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-057 (Gankoomon).
// Text:
//   [Digivolve] Lv.5 w/[CS] trait: Cost 3
//   When this card would be played, by returning 3 cards with [Huckmon], [Sistermon] or
//   [Jesmon] in their names from your trash to the top or bottom of the deck, reduce the
//   play cost by 5.
//   [On Play] [When Digivolving] You may play 1 [Hinukamuy] Token. Then, delete 1 of your
//   opponent's Digimon with a play cost of 6 or less. For each of your other Digimon, add
//   3 to this effect's play cost maximum.
// KB Q5322: can't return only 2 of the 3 required cards — must return all 3.
// Fixes vs AUTO-GENERATED:
//   - Return cost: target filter includes zone:"trash"; raw clarifies "top or bottom"
//   - Delete: optional:false — text says "Then, delete 1..." (mandatory)
//   - CostModifier: retained as closest model for "add 3 to play cost maximum per other Digimon";
//     moves BEFORE Delete so the ceiling is computed before target resolution
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [],
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Huckmon", "Sistermon", "Jesmon"],
                    match: "name",
                  },
                ],
              },
              count: 3,
            },
            to: "deckTopOrBottom",
            raw: "by returning 3 cards with [Huckmon], [Sistermon] or [Jesmon] in their names from your trash to the top or bottom of the deck, reduce the play cost by 5",
          },
          mode: "reduceCost",
          amount: 5,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayToken",
          tokens: [
            {
              name: "Hinukamuy Token",
              keywords: [{ keyword: "Alliance" }, { keyword: "Reboot" }, { keyword: "Blocker" }],
            },
          ],
          count: 1,
          payCost: false,
          optional: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 6,
            },
            count: 1,
          },
          playCostCeiling: {
            base: 6,
            raise: 3,
            per: 1,
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            unit: "cards",
          },
          optional: false,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: [
            {
              name: "Hinukamuy Token",
              keywords: [{ keyword: "Alliance" }, { keyword: "Reboot" }, { keyword: "Blocker" }],
            },
          ],
          count: 1,
          payCost: false,
          optional: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 6,
            },
            count: 1,
          },
          playCostCeiling: {
            base: 6,
            raise: 3,
            per: 1,
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            unit: "cards",
          },
          optional: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-057", compiled);
