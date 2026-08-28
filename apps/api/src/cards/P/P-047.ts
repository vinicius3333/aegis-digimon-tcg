// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4163: trash as many of the top 3 as possible, then still evaluate the Tamer gate.
// KB Q4165: after paying the inherited return cost, the +2000 DP result is mandatory.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 3,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "forTheTurn",
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer in play",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "forTheTurn",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon", "Tamer", "Option"],
              },
              count: 3,
            },
            to: "deckBottom",
            raw: "by placing 3 non-Digi-Egg cards from your trash at the bottom of your deck in any order",
          },
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-047", compiled);
