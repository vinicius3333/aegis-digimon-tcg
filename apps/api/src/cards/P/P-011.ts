// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4116: effect is voluntary.
// KB Q4117: need at least 3 cards in deck to activate.
// KB Q4118: can only use once per attack (not stackable).
// KB Q4122: inherited effect is mandatory once activated (can't place cards then skip Draw).
const compiled: CompiledCard = {
  effects: [
    {
      // [When Attacking] If you have a blue Tamer, you may trash the top 3 cards
      // of your deck to give this Digimon +2000 DP for the turn.
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
      // [Inherited] [When Attacking] You may place 3 non-Digi-Egg cards from your trash at the
      // bottom of your deck in any order to activate <Draw 1>.
      // non-Digi-Egg = Digimon, Tamer, or Option kinds (Digi-Egg has kind "DigiEgg")
      // KB Q4120: can only activate with 3+ non-Digi-Egg in trash.
      // KB Q4122: once activated, you must also draw (not optional).
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
