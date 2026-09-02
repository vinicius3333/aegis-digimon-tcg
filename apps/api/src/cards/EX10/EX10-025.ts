// HAND-FIXED IR for EX10-025 — do not regenerate.
//
// [On Play] "place 2 cards ... as 1 of your [Mineral]/[Rock] Digimon's BOTTOM digivolution
// cards": `position: "bottom"` is load-bearing. Without it PlaceUnder passes `belowTop: true`
// and the cards land directly under the top card instead of under the whole stack.
//
// The printed quantity stays on the action (`count: 2`). PlaceUnder reads that as
// "as many as possible, up to 2", which is exactly Q5078 (2 available => must place 2) and
// Q5079 (only 1 available => place that 1). `target.count` is only the preflight minimum that
// decides whether the optional prompt is offered at all, so it is 1: raising it to 2 would
// suppress the prompt in the Q5079 case.
//
// Inherited: "when effects trash THIS card from a [Mineral] or [Rock] trait Digimon's
// digivolution cards". Two independent gates are needed and the shape mirrors EX10-028, whose
// printed inherited text is identical:
//   sourceFilter: { isSelfRef: true }  -> the trashed card must be this card
//   hostFilter: Mineral/Rock Digimon   -> the stack it was trashed from
// A bare trait `sourceFilter` on `onDigivolutionCardDiscarded` installs NO gate at all
// (the generic subject gate is skipped for discard events and only `isSelfRef` /
// `matchTrashedSource` are honoured), so the watcher fired on every digivolution-card trash
// anywhere on the board.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Mineral", "Rock"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          count: 2,
          position: "bottom",
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Mineral", "Rock"],
                match: "trait",
              },
            ],
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Mineral", "Rock"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  playCostLte: 4,
                },
                count: 1,
              },
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX10-025", compiled);
