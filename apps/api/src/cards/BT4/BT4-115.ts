import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "play",
          amount: 8,
          handResident: true,
          duration: "permanent",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 10,
            raw: "you have 10 or more cards in your trash",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [],
      keywords: [
        {
          keyword: "Recovery",
          amount: 1,
          raw: "＜Recovery +1 (Deck)＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "RestrictDigivolveInto",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          into: {
            nameOrTrait: [
              {
                tokens: ["Lucemon"],
                match: "name",
              },
            ],
          },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-115", compiled);
