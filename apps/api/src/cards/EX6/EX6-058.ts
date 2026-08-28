// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 1,
          scaling: {
            per: 1,
            unit: "lastDeletedLevel",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
        },
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 1,
          scaling: {
            per: 1,
            unit: "lastDeletedLevel",
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
          leaveCause: "otherThanBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  controller: "mine",
                  zone: "trash",
                  nameOrTrait: [
                    {
                      tokens: ["Seven Great Demon Lords"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              underFilter: {
                controller: "mine",
                zone: "breeding",
                nameOrTrait: [
                  {
                    tokens: ["Gate of Deadly Sins"],
                    match: "name",
                  },
                ],
              },
              position: "bottom",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-058", compiled);
