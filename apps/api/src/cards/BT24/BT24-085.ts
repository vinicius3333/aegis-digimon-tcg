import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const tsOption: Filter = {
  controller: "mine",
  kind: ["Option"],
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
  playCostLte: 0,
  playCostLteScaling: { per: 1, unit: "memory", filter: { controller: "opponent" } },
};
const tsDigimon: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtMost", value: 4 } }],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          effectTextPart:
            "[End of Your Turn] By suspending this Tamer, you may use 1 [TS] trait Option card with as high or lower a use cost as your opponent's memory from your hand without paying the cost.",
          kind: "Suspend",
          target: self,
          optional: true,
          abortOnDecline: true,
        },
        {
          effectTextPart:
            "[End of Your Turn] By suspending this Tamer, you may use 1 [TS] trait Option card with as high or lower a use cost as your opponent's memory from your hand without paying the cost.",
          kind: "UseOptionWithoutCost",
          filter: tsOption,
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart: "Then, 1 of your Digimon with the [TS] trait may attack.",
          kind: "Attack",
          target: { filter: tsDigimon, count: 1 },
          optional: true,
        },
      ],
    },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: self, payCost: false }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-085", compiled);
