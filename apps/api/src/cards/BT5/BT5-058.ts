import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-validated effect IR for BT5-058 (Argomon).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 2,
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            optional: true,
          },
          raw: "＜Digisorption -2＞",
        },
      ],
      keywords: [
        {
          keyword: "Digisorption",
          amount: -2,
          raw: "＜Digisorption -2＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: "all",
          },
          effect: {
            kind: "restriction",
            restriction: "unsuspend",
          },
          while: {
            kind: "youHave",
            filter: {
              isSelfRef: true,
            },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-058", compiled);
