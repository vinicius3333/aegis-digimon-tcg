import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          controller: "mine",
          op: "toHand",
          amount: 1,
          chooseFromSecurity: true,
          selectionFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Hybrid", "Ten Warriors"],
                match: "traitContains",
              },
            ],
          },
          bindResultAs: "hybridSecurityCard",
          optional: true,
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "bindingExists",
            ref: "hybridSecurityCard",
            raw: "you added a card to your hand",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "ModifySecurityDP",
          controller: "mine",
          amount: 3000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-088", compiled);
