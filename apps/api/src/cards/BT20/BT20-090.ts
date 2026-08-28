// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              unsuspended: true,
              nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }],
            },
            count: 1,
          },
          attackPlayer: true,
          optional: true,
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1 }, raw: "by suspending this Tamer" },
          condition: { kind: "handAtMost", value: 4 },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-090", compiled);
