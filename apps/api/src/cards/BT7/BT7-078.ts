import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT7-078 (AncientSphinxmon).
//
// Audit fix:
// [When Digivolving] The Delete target filter must restrict opponent's Digimon to those
// whose level is ≤ the deleted Digimon's level. The prior IR had no levelComparison on
// the target at all. Fix: add levelComparison { op: "lte", relativeTo: "lastDeleted" }
// (per BT13-109 precedent; interpreter captures the deleted level in ctx.lastDeletedLevel
// via the deleteOwn cost handler).
//
// KB Q1642: You may delete this card itself to delete a Lv.6 or lower opponent Digimon
// (this card is Lv.6, so the deleted-level bound permits Lv.6). No filter change needed
// beyond the levelComparison relativeTo lastDeleted.

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                relativeTo: "lastDeleted",
              },
            },
            count: 1,
          },
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Ten Warriors", "Hybrid"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "by deleting 1 of your Digimon with [Ten Warriors] or [Hybrid] in its traits",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              colors: ["Purple"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-078", compiled);
