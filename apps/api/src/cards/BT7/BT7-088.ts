import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] You may search your security stack for 1 card with [Hybrid] or [Ten Warriors] in its traits, reveal it, and add it to your hand. If you added a card to your hand, ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.)",
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
          effectTextPart: "Then, shuffle your security stack.",
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
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-088", compiled);
