import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
            upTo: true,
          },
          restriction: "attackOrBlock",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, if you have a blue Digimon in play, return 1 of your opponent's suspended Digimon to its owner's hand. (Trash all of its digivolution cards.)",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
            },
            raw: "you have a blue Digimon in play",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
            upTo: true,
          },
          restriction: "attack",
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, if you have a blue Digimon in play, return 1 of your opponent's suspended Digimon to its owner's hand. (Trash all of its digivolution cards.)",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
            },
            raw: "you have a blue Digimon in play",
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-104", compiled);
