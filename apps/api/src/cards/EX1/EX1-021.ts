// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX1-021 (MetalGarurumon).
// runtime-effect fixes:
// - Return target filter: changed match:"trait" to match:"text" for "On Deletion" (text
//   says "Digimon with an [On Deletion] effect", a text-presence match, not a literal
//   trait named "On Deletion"; BT5-031 pattern). ReturnToDeck atomically moves the selected
//   Digimon to its owner's deck and trashes its attached sources, which is the printed
//   "trash all of the digivolution cards" result.
// - Condition: requires BOTH 8+ cards in hand AND a Tamer in play (was hand-count only).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 4,
            filter: {
              zone: "hand",
              controller: "mine",
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["On Deletion"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          to: "deckBottom",
          condition: {
            kind: "allOf",
            conditions: [
              {
                kind: "handAtLeast",
                value: 8,
              },
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Tamer"],
                },
              },
            ],
            raw: "you have 8 or more cards in your hand and a Tamer in play",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-021", compiled);
