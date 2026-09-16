import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Hand][Main] If you have a Digimon with [Blue Flare] in its traits in play, by paying 3 memory, place this card under 1 of those Digimon as its bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          position: "bottom",
          underFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Blue Flare"],
                match: "trait",
              },
            ],
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Blue Flare"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon with [Blue Flare] in its traits in play",
          },
          cost: {
            kind: "payMemory",
            memory: 3,
            raw: "by paying 3 memory",
          },
          abortOnDecline: true,
          bindHostAs: "bt10025PlaceHost",
        },
        {
          effectTextPart: "Then, unsuspend that Digimon.",
          kind: "Unsuspend",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              boundRef: "bt10025PlaceHost",
            },
            count: 1,
          },
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "opponentHas",
            filter: {
              zone: "battleArea",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
            raw: "your opponent has 2 or more Digimon in play",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-025", compiled);
