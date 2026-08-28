// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored fix:
// (1) Source zones: hand + trash only (removed digivolutionCards — not in text).
// (2) Target kind: Digimon only (removed Tamer — text says "1 Digimon card").
// (3) underFilter: must be a [Bagra Army] Digimon OR [Bagra Army] Tamer, encoded as
//     `Filter.or` — the key the interpreter reads. An earlier revision used `orFilters`
//     (a Target/cost key, not a Filter key), which left the destination filter with no
//     recognized constraint at all, so every permanent on the board qualified as a host.
// (4) position: bottom — text says "bottom digivolution cards" for Digimon dest;
//     KB Q5119 confirms bottom ordering for Tamer dest too.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Bagra Army"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            or: [
              {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Bagra Army"],
                    match: "trait",
                  },
                ],
              },
              {
                kind: ["Tamer"],
                nameOrTrait: [
                  {
                    tokens: ["Bagra Army"],
                    match: "trait",
                  },
                ],
              },
            ],
          },
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          optional: true,
        },
      ],
      keywords: [
        {
          keyword: "Save",
          raw: "＜Save＞",
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
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
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

registerIrCard("EX10-039", compiled);

export { compiled };
