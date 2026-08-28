// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const tsOption = {
  controller: "mine",
  kind: ["Option"],
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
  playCostLte: 0,
  playCostLteScaling: { per: 1, unit: "memory", filter: { controller: "opponent" } },
};
const tsDigimon = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtMost", value: 4 } }],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "Suspend", target: self, optional: true, abortOnDecline: true },
        { kind: "UseOptionWithoutCost", filter: tsOption, from: ["hand"], payCost: false, optional: true },
        { kind: "Attack", target: { filter: tsDigimon, count: 1 }, optional: true },
      ],
    },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: self, payCost: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-085", compiled);
