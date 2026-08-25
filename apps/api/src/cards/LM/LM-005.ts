// @ts-nocheck
// LM-005 Amphimon — hand-fixed IR.
// KB Q3994: trash 2 blue cards => trash 1 under each of 2 Digimon/Tamers (usePaidCount scales).
// KB Q3995: WhenAttacking SecurityAttack+1 can fire multiple times in a turn if Digimon attacks again.
// Fixes applied:
//   - the return target filter adds digivolutionCards:"none"
//   - WhenAttacking: added SecurityAttack+1 for the turn behind a return-3-Jellymon cost
// Audit fixes (LM audit):
//   - the [Hand][Counter] parenthetical is the <Blast Digivolve> keyword; without the marker
//     the cost waiver was never registered for this card
//   - "trash any 1 card UNDER your opponent's Digimon or Tamers" trashes DIGIVOLUTION CARDS,
//     not the permanents themselves — TrashDigivolution with scope "acrossDigimon" pools the
//     opponent's stacks so Q3994's "1 under each of 2" selection is reachable
//   - `usePaidCount` reads the count paid by the action's OWN cost, so the hand trash moves
//     from a preceding action into that cost (the EX12-030 pattern for the same archetype)
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "[Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost)",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          scope: "acrossDigimon",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: "all",
          },
          amount: 1,
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                colors: ["Blue"],
              },
              count: 4,
              upTo: true,
            },
            raw: "You may trash up to 4 blue cards in your hand",
          },
          scaling: {
            per: 1,
            unit: "cards",
            usePaidCount: true,
          },
          raw: "For each one, trash any 1 card under your opponent's Digimon or Tamers",
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "none",
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          scope: "acrossDigimon",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: "all",
          },
          amount: 1,
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                colors: ["Blue"],
              },
              count: 4,
              upTo: true,
            },
            raw: "You may trash up to 4 blue cards in your hand",
          },
          scaling: {
            per: 1,
            unit: "cards",
            usePaidCount: true,
          },
          raw: "For each one, trash any 1 card under your opponent's Digimon or Tamers",
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              digivolutionCards: "none",
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Jellymon"],
                    match: "text",
                  },
                ],
              },
              count: 3,
              from: ["trash"],
            },
            to: "deckBottom",
            raw: "By returning 3 cards with [Jellymon] in their texts from your trash to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-005", compiled);
