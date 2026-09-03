import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          source: "securityTop",
          chooseFromSecurity: true,
          selectionFilter: { controller: "mine" },
          amount: 1,
          bindResultAs: "bt1-087-selected",
        },
        {
          kind: "Recover",
          amount: 1,
          condition: { kind: "bindingContains", ref: "bt1-087-selected", filter: { colors: ["Yellow"] } },
        },
        { kind: "SecurityManipulation", op: "shuffle", controller: "mine" },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-087", compiled);
export default compiled;
