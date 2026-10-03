import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] Search your security stack, reveal 1 card from it, and add it to your hand. If it's a yellow card, ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.)",
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
          effectTextPart: "Then, shuffle your security stack.",
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
