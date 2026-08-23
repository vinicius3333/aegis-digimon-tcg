// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const tsDigimon = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "GainMemory", amount: 1 },
        { kind: "Suspend", target: self, condition: { kind: "memoryAtLeast", value: 5 } },
        { kind: "Draw", controller: "mine", amount: 1, condition: { kind: "memoryAtLeast", value: 5 } },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: { filter: tsDigimon, count: "all" },
          effect: { kind: "modifyDP", amount: 1000 },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "ActivateForeignEffect",
          zone: "battleArea",
          fromTriggers: ["OnPlay", "WhenDigivolving"],
          filter: {
            controller: "mine",
            zone: "battleArea",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Olympos XII"], match: "trait" }],
          },
          count: 1,
          cost: { kind: "suspend", target: self },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-102", compiled);
