// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: "bt1-084-name" },
        },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], sameNameAsSelection: "bt1-084-name" },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "digivolutionCards",
              controller: "mine",
              kind: ["Digimon"],
              levels: [6],
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          to: "hand",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-084", compiled);
export default compiled;
