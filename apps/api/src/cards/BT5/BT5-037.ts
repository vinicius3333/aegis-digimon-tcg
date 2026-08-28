// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Search",
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
          controller: "mine",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-037", compiled);
