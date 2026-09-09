// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
                keywords: ["Fortitude"],
              },
              count: 1,
              to: "play",
            },
            {
              // The printed "add the rest to your hand" branch is represented as a
              // second disposition slot. RevealAdd's rest field only supports deck/trash;
              // this catch-all consumes the revealed card when the Fortitude play slot
              // cannot take it.
              filter: {},
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
                keywords: ["Fortitude"],
              },
              count: 1,
              to: "play",
            },
            {
              filter: {},
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "mine",
              kind: ["Digimon"],
              keywords: ["Fortitude"],
            },
            count: "all",
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-042", compiled);
