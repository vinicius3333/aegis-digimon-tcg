// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main] Place 1 of your opponent's Digimon face down at the top or bottom of
// your opponent's security stack. If you do, trash the top card of that stack.
// [Security] You may place 1 of your opponent's Digimon face down at the top or
// bottom of its owner's security stack.
// Q746: placing on top means the placed Digimon is the card trashed next.
// Q747/Q1909: placement prevention leaves the Digimon in play and suppresses
// the conditional trash because the placement did not act.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
            bindAs: "chaosDegradationTarget",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "opponent",
          source: {
            fromSelectionRef: "chaosDegradationTarget",
            filter: {},
            count: 1,
          },
          faceDown: true,
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "SelectBind",
          optional: true,
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
            bindAs: "chaosDegradationSecurityTarget",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "opponent",
          source: {
            fromSelectionRef: "chaosDegradationSecurityTarget",
            filter: {},
            count: 1,
          },
          faceDown: true,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST10-14", compiled);
