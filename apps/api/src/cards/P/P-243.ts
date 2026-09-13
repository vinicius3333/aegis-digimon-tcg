import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The printed Delay effect is available at the start of your turn only while the
// opponent has a Digimon, and returns a DM Digimon from trash to the deck top.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: ["battleArea", "breeding"],
              nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
            },
            raw: "you have a card w/[DM] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: ["hand"],
              },
              count: 1,
            },
            raw: "By trashing 1 card in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "StartOfYourTurn",
      condition: {
        kind: "opponentHas",
        filter: {
          controllerDefault: "opponent",
          kind: ["Digimon"],
        },
        raw: "your opponent has a Digimon",
      },
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["DM"],
                  match: "trait",
                },
              ],
              playCostLte: 3,
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          cost: {
            kind: "return",
            to: "deckTop",
            target: {
              filter: {
                controller: "mine",
                zone: ["trash"],
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["DM"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By returning 1 [DM] trait Digimon card from trash to the top of your deck",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["DM"],
                  match: "trait",
                },
              ],
              playCostLte: 3,
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-243", compiled);
