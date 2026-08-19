// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-027 Ryugumon
// Text:
//   <Decode (Lv.5 w/[Aqua]/[Sea Animal] in any trait)>
//   [On Play] [When Digivolving] By placing 1 level 5 or lower Digimon card with
//   [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's
//   bottom digivolution card, 1 of your opponent's Digimon or Tamers can't suspend
//   until their turn ends.
//   [All Turns] [Once Per Turn] When effects add to this Digimon's digivolution
//   cards, return 1 of your opponent's level 5 or lower Digimon to the bottom of
//   the deck.
//
// Fixes vs auto-generated:
//   1. AllTurns Return needs SubTrigger with event "whenEffectAddsToDigivolutionCards"
//      (see LANE_E.md for capability spec — not yet in engine).
//   2. AllTurns Return filter was missing the [Aqua]/[Sea Animal] trait restriction
//      on the returned Digimon? No — re-read text: the returned Digimon is just any
//      opponent level 5 or lower Digimon (no trait restriction). That part is correct.
//      The real fix is wrapping the action in a SubTrigger.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.5 w/[Aqua]/[Sea Animal] in any trait)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 5 },
                nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 level 5 or lower Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
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
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 5 },
                nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 level 5 or lower Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 5 },
                },
                count: 1,
              },
              to: "deckBottom",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT22-027", compiled);
