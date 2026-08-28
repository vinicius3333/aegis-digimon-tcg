// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: { kind: ["Digimon", "Tamer"], zone: "trash" },
          mode: "play",
          duration: "untilOpponentTurnEnd",
          byEffectOnly: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: { kind: ["Digimon", "Tamer"], zone: "trash" },
          mode: "play",
          duration: "untilOpponentTurnEnd",
          byEffectOnly: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
          dpCeilingScaling: {
            per: 1,
            amount: 2000,
            unit: "cards",
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
          dpCeilingScaling: {
            per: 1,
            amount: 2000,
            unit: "cards",
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
          dpCeilingScaling: {
            per: 1,
            amount: 2000,
            unit: "cards",
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT23-014", compiled);
export { compiled };
