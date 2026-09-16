import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
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
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
              colors: ["Blue"],
            },
            raw: "you have a blue Tamer",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "deck",
              },
              count: 3,
            },
            raw: "by trashing the top 3 cards of your deck",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          controller: "mine",
          optional: true,
          condition: {
            kind: "youHave",
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Digimon", "Tamer", "Option"],
            },
            count: 3,
            raw: "you have at least 3 non-Digi-Egg cards in your trash (KB Q4120)",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                controller: "mine",
                zone: "trash",
                kind: ["Digimon", "Tamer", "Option"],
              },
              count: 3,
            },
            to: "deckBottom",
            raw: "by returning 3 non-Digi-Egg cards from your trash to the bottom of your deck",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-011", compiled);
