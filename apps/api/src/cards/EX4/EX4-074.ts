// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          playerWide: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -5000,
          duration: "untilOpponentNextTurnEnd",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "ModifyDP",
          playerWide: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -5000,
          duration: "untilOpponentNextTurnEnd",
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "SecurityManipulation",
          op: "placeFromDeck",
          controller: "mine",
          amount: 1,
          toTop: true,
        },
        {
          kind: "Hatch",
          amount: 1,
          controller: "mine",
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
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["ShineGreymon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-074", compiled);
