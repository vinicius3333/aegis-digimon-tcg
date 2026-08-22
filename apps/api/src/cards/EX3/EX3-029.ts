// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          chooseFromSecurity: true,
          bindResultAs: "selectedSecurity",
        },
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "bindingContains",
            ref: "selectedSecurity",
            filter: { colors: ["Yellow"] },
          },
          ifTrue: [{ kind: "Recover", amount: 1 }],
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-029", compiled);
