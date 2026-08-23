// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            digivolutionStackKind: ["Tamer"],
          },
          into: {
            controller: "mine",
            zone: "hand",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Beowolfmon"], match: "name" }],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 2,
              raw: "reduce the digivolution cost by 2",
            },
          ],
          raw: "When one of your Digimon with a Tamer in its digivolution cards would digivolve into this card, reduce the cost by 2.",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
            bindAs: "returnTarget",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                controller: "mine",
                zone: "digivolutionCards",
                hostFilter: { isSelfRef: true },
                nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }],
              },
              count: 1,
            },
            raw: "by returning 1 Hybrid card from this Digimon's digivolution cards to your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "TrashDigivolution",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "returnTarget",
          },
          amount: "all",
        },
        {
          kind: "Return",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "returnTarget",
          },
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-025", compiled);
