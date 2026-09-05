// HAND-FIXED IR for BT8-084 — do not regenerate.
// WhenDigivolving PlaceUnder: add from:["trash"]; ModifyDP scaling: isSelfRef (this Digimon's colors).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          from: ["trash"],
          position: "bottom",
          optional: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 4,
            upTo: true,
          },
          amount: -1000,
          duration: "untilOpponentTurnEnd",
          scaling: {
            per: 1,
            unit: "selfAndDigivolutionCardColors",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "hasAllDigivolutionColors",
          tokens: [],
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 4000,
          },
          while: {
            kind: "selfColorCount",
            op: "gte",
            value: 4,
            raw: "this Digimon has 4 or more colors",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-084", compiled);
