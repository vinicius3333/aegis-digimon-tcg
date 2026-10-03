import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Search",
          effectTextPart:
            "[On Play] You may search your security stack for 1 Digimon card with [Warrior] or [Holy Warrior] in its type, reveal it, and add it to your hand. If you do, trigger ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.)",
          controller: "mine",
          filter: {
            zone: "security",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Warrior", "Holy Warrior"],
                match: "trait",
              },
            ],
          },
          count: 1,
          to: "hand",
          optional: true,
          bindResultAs: "securitySearchResult",
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "bindingExists",
            ref: "securitySearchResult",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          effectTextPart: "Then, shuffle your security stack.",
          controller: "mine",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-037", compiled);
