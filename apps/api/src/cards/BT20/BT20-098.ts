// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT20-098 — Apparition Legion / Phantomon
// [Main] By returning 9 levels' total worth of Digimon cards from your opponent's
// trash to the bottom of the deck, play 1 [Ghost] Digimon card of each returned card's
// level from your trash without paying the costs. Then, 1 of the Digimon played by this
// effect gains Rush and Blocker until the end of your opponent's turn.
// [Security] Play 1 level 5 or lower [Ghost] Digimon from your trash without paying its cost.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayPerLevel",
          cost: {
            kind: "return",
            target: {
              filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] },
              totalLevels: 9,
            },
            to: "deckBottom",
            raw: "By returning 9 levels' total worth of Digimon cards from your opponent's trash to the bottom of the deck",
          },
          playFilter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
          },
          matchLevel: true,
          payCost: false,
          bindResultAs: "playedByThisEffect",
          optional: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: { boundRef: "playedByThisEffect", kind: ["Digimon"] },
            count: "all",
          },
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: { boundRef: "playedByThisEffect", kind: ["Digimon"] },
            count: "all",
          },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "untilOpponentTurnEnd",
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
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
            },
            count: 1,
          },
          from: ["trash"],
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

registerIrCard("BT20-098", compiled);
export { compiled };
