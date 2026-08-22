// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] },
            count: 1,
            to: "placeUnder",
            asTop: false,
          }],
          rest: "trash",
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 },
          condition: {
            kind: "selfDigivolutionStackCountAtLeast",
            filter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] },
            count: 5,
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenOpponentAttacks",
        actions: [{
          kind: "RedirectAttack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }],
                digivolutionCardsOf: { filter: { name: "Galacticmon" } },
              },
              count: 2,
              from: ["digivolutionCards"],
            },
          },
          optional: true,
          abortOnDecline: true,
        }],
      }],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-070", compiled);
