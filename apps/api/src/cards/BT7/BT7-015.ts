import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT7-015 AvengeKidmon
// effectText: When playing this card from your hand, reduce its memory cost by 1 for each
//   Option card in you and your opponent's trashes.
//   [On Play] Return all cards with [Three Musketeers] in their traits and all Option cards
//   from both players' trashes to the bottom of their owners' decks. If 7 or more cards were
//   returned using this effect, delete 1 of your opponent's Digimon with [Three Musketeers] in
//   its traits or 8000 DP or less.
//
// KB Q1517: counts Option cards in BOTH players' trashes (not just opponent's).
// KB Q1518: player who activated the effect decides the order cards are returned.
//
// The scaling/target filters below omit `controller`, which is NOT a "mine"
// default: `seatsForController` (interpreter.ts) treats an absent controller as
// BOTH seats, so the cost-reduction count and the Return already cover both
// players' trashes per Q1517/Q1518 without an explicit field.
//
// Fixes applied this pass:
// 1. The hand-play reducer must resolve in BeforePayCost while this card is still
//    in hand. A Static CostModifier is field-resident and cannot affect its own
//    imminent play; BeforePayCost's handResident self path applies the reduction
//    directly to the pending play cost.
// 2. CostModifier had no `target`, so `if (!want) return false` made the whole
//    reduction a silent no-op. Added the codebase's standard self-ref target
//    shape (isSelfRef + isSelf, see BT12-040/P-116) so it reduces this card's
//    own play cost only.
// 3. The two independent "return all" actions (trait match, Option kind) would
//    double-return a card matching both (e.g. BT25-085 BeelStarmon is kind
//    Digimon+Option with the Three Musketeers trait). Merged into one Return
//    with `orFilters` (candidateLooseInstances unions + dedupes by instanceId),
//    matching the OR pattern already used below on the Delete filter.
// 4. Delete condition "7 or more returned": the Return records its tally via
//    trackCount:"returnedByEffect" (ctx.namedCounts), and the Delete gates on it
//    via the namedCountAtLeast condition (count 7).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "play",
          amount: 1,
          handResident: true,
          duration: "permanent",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          scaling: {
            per: 1,
            filter: {
              zone: "trash",
              kind: ["Option"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                zone: "trash",
                kind: ["Option"],
              },
            ],
            count: "all",
          },
          to: "deckBottom",
          trackCount: "returnedByEffect",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                controller: "opponent",
                kind: ["Digimon"],
                dp: {
                  op: "lte",
                  value: 8000,
                },
              },
            ],
            count: 1,
          },
          condition: {
            kind: "namedCountAtLeast",
            countSource: "returnedByEffect",
            count: 7,
            raw: "7 or more cards were returned using this effect",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-015", compiled);
