import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] ＜Draw 1＞",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Knight", "CS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          restriction: "beReturned",
          duration: "untilOpponentTurnEnd",
          byOpponentEffectsOnly: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] ＜Draw 1＞",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Royal Knight", "CS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          restriction: "beReturned",
          duration: "untilOpponentTurnEnd",
          byOpponentEffectsOnly: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Veemon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-054", compiled);
