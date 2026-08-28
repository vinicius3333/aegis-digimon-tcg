// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Recovery",
            amount: 1,
            raw: "＜Recovery +1 (Deck)＞",
          },
          duration: "permanent",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Kentaurosmon"], match: "nameExact" }],
              },
              count: 1,
            },
            to: "deckBottom",
            raw: "by returning 1 [Kentaurosmon] from your trash to the bottom of your deck",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
          },
          amount: -1000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-043", compiled);
