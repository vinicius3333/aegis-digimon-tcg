// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        { kind: "RestrictPlay", seat: "opponent", filter: { kind: ["Digimon", "Tamer"], zone: "trash" }, mode: "play", duration: "untilOpponentTurnEnd", byEffectOnly: true },
        { kind: "DeletionMaxDpModifier", amount: 2000, scope: "self", duration: "forTheTurn", scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 } },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "RestrictPlay", seat: "opponent", filter: { kind: ["Digimon", "Tamer"], zone: "trash" }, mode: "play", duration: "untilOpponentTurnEnd", byEffectOnly: true },
        { kind: "DeletionMaxDpModifier", amount: 2000, scope: "self", duration: "forTheTurn", scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 } },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        { kind: "DeletionMaxDpModifier", amount: 2000, scope: "self", duration: "forTheTurn", scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT23-014", compiled);
export { compiled };
