// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
      names: ["Veemon"],
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
