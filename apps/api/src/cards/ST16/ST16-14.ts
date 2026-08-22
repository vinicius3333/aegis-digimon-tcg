// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3 }],
      condition: { kind: "memoryAtMost", value: 2, raw: "you have 2 or less memory" },
    },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "SubTrigger",
        event: "whenTrashedFromHand",
        actions: [{
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          condition: { kind: "triggerByYourEffect" },
          optional: true,
        }],
      }],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST16-14", compiled);
export { compiled };
