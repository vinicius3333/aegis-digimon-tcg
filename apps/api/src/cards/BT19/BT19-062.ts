import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Attacking] "trash 1 Option card in the battle area" — KB Q3120 clarifies this
// trashes an Option card placed by a "place this card in the battle area" effect.
// [End of Your Turn] — KB Q3122 confirms this Digimon must attack a player if possible.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "battleArea",
              controller: "mine",
              kind: ["Option"],
              placedInBattleAreaByEffect: true,
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          attackPlayer: true,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              unsuspended: true,
              kind: ["Digimon"],
            },
            raw: "your opponent has an unsuspended Digimon",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Strikedramon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-062", compiled);
