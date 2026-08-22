// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [],
          rest: "deckTopOrBottom",
          cost: {
            kind: "place",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            underFilter: {
              zone: "battleArea",
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
              isToken: false,
            },
            destination: "digivolutionStack",
            position: "bottom",
            raw: "by placing this card under 1 of your other Digimon as its bottom digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Legend-Arms"], match: "trait" }],
            },
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Raid", raw: "＜Raid＞" } },
          while: {
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Legend-Arms"], match: "trait" }],
                },
              },
              {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  colors: ["Black"],
                },
              },
            ],
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-097", compiled);
