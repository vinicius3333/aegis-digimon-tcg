import { type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
    {
      trigger: "OnLoseSecurity",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "isYourTurn" },
              { kind: "selfDpAtLeast", value: 10000 },
              { kind: "triggerAttackerIsSelf" },
            ],
            raw: "while this Digimon has 10000 or more DP, when this Digimon checks security",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-088", compiled);
export { compiled };
