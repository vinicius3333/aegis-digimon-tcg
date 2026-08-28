// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Static] cost-reduction: reduce play cost by 2, but ONLY if you have [Alice McCoy] in play.
// The outer Replacement gates on self being played (wouldBePlayed).
// The inner Replacement carries a youHave condition for the Alice McCoy in-play check.
const compiled: CompiledCard = {
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
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              condition: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Tamer"],
                  nameOrTrait: [
                    {
                      tokens: ["Alice McCoy"],
                      match: "name",
                    },
                  ],
                },
                raw: "if you have [Alice McCoy] in play",
              },
              raw: "reduce its play cost by 2 if you have [Alice McCoy] in play",
            },
          ],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 3,
        },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon", "Tamer"],
              colors: ["Purple"],
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-041", compiled);
