// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4166: fewer than 3 non-Digi-Egg cards cannot pay the optional cost.
// KB Q4168: once paid, both unsuspend actions are mandatory.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
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
          abortOnDecline: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: { controller: "mine", kind: ["Tamer"] },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCardReturnsFromTrashToDeck",
          raw: "when a card is returned from your trash to your deck",
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-048", compiled);
