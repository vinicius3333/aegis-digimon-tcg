// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const optionFilter = {
  kind: ["Option"],
  orFilters: [
    { nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] },
    { colors: ["Yellow"], playCostLte: 5 },
  ],
};
const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "UseOptionWithoutCost", target: { filter: optionFilter, count: 1, from: ["hand"] }, payCost: false, optional: true },
        { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", source: "lastOptionUsed", from: ["trash"], toTop: true, faceUp: false, condition: { kind: "ifThisEffectUsed" } },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [{ kind: "Digivolve", target: self, into: { nameOrTrait: [{ tokens: ["Sakuyamon"], match: "name" }] }, from: ["hand"], payCost: true, costOverride: 1, ignoreRequirements: true, optional: true }],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };
registerIrCard("BT10-041", compiled);
